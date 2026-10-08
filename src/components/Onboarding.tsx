import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { structureOfferInput, structureNeedInput, extractSkillTags } from '@/lib/matchingEngine';
import { ArrowRight, ArrowLeft, Check, Sparkles, Clock, Wrench, Gift, Sun, Moon, Users } from 'lucide-react';
import type { Community } from '@/lib/types';

interface OnboardingData {
  communityId: string | null;
  skills: string;
  offerCategories: string[];
  offerDetails: string;
  needDetails: string;
  availability: string[];
  maxTravel: number;
  exchangePrefs: string[];
}

const STEPS = [
  { key: 'welcome', title: 'Welcome to Barter', subtitle: "Let's get you set up. This will feel like a conversation, not a form." },
  { key: 'community', title: 'Choose your community', subtitle: 'Which community do you belong to?' },
  { key: 'skills', title: 'What are you good at?', subtitle: 'Tell us in your own words. We\'ll figure out the rest.' },
  { key: 'categories', title: 'What are you willing to offer?', subtitle: 'Choose all that apply.' },
  { key: 'offer', title: 'What can you help with?', subtitle: 'Describe what you\'d like to do for others.' },
  { key: 'need', title: 'What could you use help with?', subtitle: "What do you need? We'll find someone who can help." },
  { key: 'availability', title: 'When are you usually available?', subtitle: 'Select all times that work for you.' },
  { key: 'travel', title: 'How far are you willing to travel?', subtitle: 'This helps us match you with nearby members.' },
  { key: 'exchange', title: 'What kind of exchange are you comfortable with?', subtitle: 'You can change this later.' },
];

const CATEGORY_OPTIONS = [
  { value: 'time', label: 'Time', icon: Clock, desc: 'Volunteer, help out, be present' },
  { value: 'talent', label: 'Talent', icon: Wrench, desc: 'Professional skills and expertise' },
  { value: 'treasure', label: 'Treasure', icon: Gift, desc: 'Tools, equipment, resources' },
];

const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Evenings', 'Mornings', 'Afternoons'];

const TRAVEL_OPTIONS = [
  { value: 1, label: 'Same building' },
  { value: 3, label: 'Same neighborhood' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: 'Anywhere in community' },
];

const EXCHANGE_OPTIONS = [
  { value: 'direct', label: 'Direct exchange', desc: 'One-to-one help' },
  { value: 'service_for_service', label: 'Service for service', desc: 'I help you, you help me' },
  { value: 'service_for_resource', label: 'Service for resource', desc: 'I help, you share a resource' },
  { value: 'helping_without_return', label: 'Helping without expecting anything back', desc: 'I just want to serve' },
  { value: 'multi_person', label: 'Multi-person exchange', desc: 'I\'m open to group exchanges' },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [data, setData] = useState<OnboardingData>({
    communityId: null,
    skills: '',
    offerCategories: [],
    offerDetails: '',
    needDetails: '',
    availability: [],
    maxTravel: 10,
    exchangePrefs: ['direct', 'helping_without_return'],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('communities').select('*').order('name').then(({ data: d }) => {
      if (d) setCommunities(d as Community[]);
      setLoadingCommunities(false);
    });
  }, []);

  const update = (partial: Partial<OnboardingData>) => setData((d) => ({ ...d, ...partial }));
  const toggleArrayItem = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleComplete = async () => {
    if (!user || !data.communityId) return;
    setSaving(true);
    setError(null);

    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          community_id: data.communityId,
          max_travel_km: data.maxTravel,
          exchange_preferences: data.exchangePrefs,
          onboarding_complete: true,
          location_zone: 'Community Area',
          location_lat: 40.71 + (Math.random() - 0.5) * 0.05,
          location_lng: -74.0 + (Math.random() - 0.5) * 0.05,
        })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      const offerStructured = structureOfferInput(data.offerDetails || data.skills);
      const { error: offerErr } = await supabase.from('offers').insert({
        user_id: user.id,
        community_id: data.communityId,
        category: offerStructured.category,
        title: offerStructured.title,
        description: data.offerDetails || data.skills,
        skill_tags: offerStructured.skill_tags,
        skill_level: offerStructured.level,
        availability: data.availability,
        is_active: true,
      });

      if (offerErr) throw offerErr;

      if (data.needDetails.trim()) {
        const needStructured = structureNeedInput(data.needDetails);
        const { error: needErr } = await supabase.from('needs').insert({
          user_id: user.id,
          community_id: data.communityId,
          category: needStructured.category,
          title: needStructured.title,
          description: data.needDetails,
          skill_tags: needStructured.skill_tags,
          urgency: needStructured.urgency,
          frequency: 'occasional',
          status: 'active',
        });

        if (needErr) throw needErr;
      }

      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const canProceed = (): boolean => {
    switch (STEPS[step].key) {
      case 'community': return data.communityId !== null;
      case 'skills': return data.skills.trim().length > 0;
      case 'categories': return data.offerCategories.length > 0;
      case 'offer': return data.offerDetails.trim().length > 0;
      case 'availability': return data.availability.length > 0;
      default: return true;
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const structuredPreview = data.offerDetails.trim()
    ? structureOfferInput(data.offerDetails)
    : data.skills.trim()
    ? structureOfferInput(data.skills)
    : null;
  const needPreview = data.needDetails.trim() ? structureNeedInput(data.needDetails) : null;

  const inputClass = "w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-border-2 transition-colors resize-none";

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:border-border-2 transition-all"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-accent' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="bg-surface-2 rounded-2xl border border-border p-6 lg:p-8">
          <div className="mb-1 text-xs text-text-tertiary font-medium tracking-wider uppercase">
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">{STEPS[step].title}</h2>
          <p className="text-text-secondary text-sm mb-6">{STEPS[step].subtitle}</p>

          <div className="min-h-[200px]">
            {STEPS[step].key === 'welcome' && (
              <div className="space-y-4">
                <p className="text-text-primary leading-relaxed">
                  Hi{profile?.full_name ? `, ${profile.full_name}` : ''}. Barter helps you discover and coordinate
                  exchanges with people in your community.
                </p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  We believe every person carries something that can bless someone else. Our AI agent will learn
                  what you have to offer and what you need, then find meaningful connections — even multi-person
                  exchanges you might never discover on your own.
                </p>
                <div className="bg-surface-3 rounded-xl p-4 border border-border">
                  <p className="text-text-secondary text-sm font-medium mb-3">The three categories:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <Clock className="w-5 h-5 text-text-secondary mx-auto mb-1" />
                      <p className="text-text-secondary text-xs font-medium">Time</p>
                    </div>
                    <div className="text-center">
                      <Wrench className="w-5 h-5 text-text-secondary mx-auto mb-1" />
                      <p className="text-text-secondary text-xs font-medium">Talent</p>
                    </div>
                    <div className="text-center">
                      <Gift className="w-5 h-5 text-text-secondary mx-auto mb-1" />
                      <p className="text-text-secondary text-xs font-medium">Treasure</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {STEPS[step].key === 'community' && (
              <div className="space-y-3">
                {loadingCommunities ? (
                  <p className="text-text-tertiary text-sm">Loading communities...</p>
                ) : (
                  communities.map((comm) => {
                    const selected = data.communityId === comm.id;
                    return (
                      <button
                        key={comm.id}
                        onClick={() => update({ communityId: comm.id })}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                          selected
                            ? 'border-accent bg-surface-3'
                            : 'border-border bg-surface-2 hover:border-border-2'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          selected ? 'bg-accent' : 'bg-surface-3'
                        }`}>
                          <Users className={`w-5 h-5 ${selected ? 'text-accent-text' : 'text-text-tertiary'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{comm.name}</p>
                          <p className="text-text-muted text-xs mt-0.5">{comm.description}</p>
                        </div>
                        {selected && <Check className="w-5 h-5 text-text-primary flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {STEPS[step].key === 'skills' && (
              <div>
                <textarea
                  value={data.skills}
                  onChange={(e) => update({ skills: e.target.value })}
                  rows={4}
                  autoFocus
                  className={inputClass}
                  placeholder="I'm a software developer. I know how to cook. I repair phones..."
                />
                {data.skills.trim().length > 10 && (
                  <div className="mt-3 text-xs text-text-tertiary">
                    Detected skills: {extractSkillTags(data.skills).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') || 'analyzing...'}
                  </div>
                )}
              </div>
            )}

            {STEPS[step].key === 'categories' && (
              <div className="grid grid-cols-1 gap-3">
                {CATEGORY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = data.offerCategories.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => update({ offerCategories: toggleArrayItem(data.offerCategories, opt.value) })}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        selected ? 'border-accent bg-surface-3' : 'border-border bg-surface-2 hover:border-border-2'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${selected ? 'text-text-primary' : 'text-text-tertiary'}`} />
                      <div className="flex-1">
                        <p className={`font-medium ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</p>
                        <p className="text-text-muted text-xs">{opt.desc}</p>
                      </div>
                      {selected && <Check className="w-5 h-5 text-text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}

            {STEPS[step].key === 'offer' && (
              <div>
                <textarea
                  value={data.offerDetails}
                  onChange={(e) => update({ offerDetails: e.target.value })}
                  rows={4}
                  autoFocus
                  className={inputClass}
                  placeholder="I can help people build websites and teach beginners programming..."
                />
                {structuredPreview && (
                  <div className="mt-4 bg-surface-3 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-text-secondary" />
                      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Barter understood:</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p className="text-text-primary"><span className="text-text-tertiary">Skills:</span> {structuredPreview.skill_tags.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') || 'General'}</p>
                      <p className="text-text-primary"><span className="text-text-tertiary">Level:</span> {structuredPreview.level.charAt(0).toUpperCase() + structuredPreview.level.slice(1)}</p>
                      <p className="text-text-primary"><span className="text-text-tertiary">Category:</span> {structuredPreview.category.charAt(0).toUpperCase() + structuredPreview.category.slice(1)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {STEPS[step].key === 'need' && (
              <div>
                <textarea
                  value={data.needDetails}
                  onChange={(e) => update({ needDetails: e.target.value })}
                  rows={4}
                  autoFocus
                  className={inputClass}
                  placeholder="I need someone to help me create a logo and occasionally help with accounting..."
                />
                {needPreview && (
                  <div className="mt-4 bg-surface-3 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-text-secondary" />
                      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Barter understood:</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <p className="text-text-primary"><span className="text-text-tertiary">Needs:</span> {needPreview.skill_tags.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') || 'General help'}</p>
                      <p className="text-text-primary"><span className="text-text-tertiary">Urgency:</span> {needPreview.urgency.charAt(0).toUpperCase() + needPreview.urgency.slice(1)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {STEPS[step].key === 'availability' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const selected = data.availability.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => update({ availability: toggleArrayItem(data.availability, opt) })}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                        selected ? 'border-accent bg-surface-3 text-text-primary' : 'border-border bg-surface-2 text-text-tertiary hover:border-border-2'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {STEPS[step].key === 'travel' && (
              <div className="grid grid-cols-1 gap-3">
                {TRAVEL_OPTIONS.map((opt) => {
                  const selected = data.maxTravel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => update({ maxTravel: opt.value })}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selected ? 'border-accent bg-surface-3' : 'border-border bg-surface-2 hover:border-border-2'
                      }`}
                    >
                      <span className={`font-medium ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</span>
                      {selected && <Check className="w-5 h-5 text-text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}

            {STEPS[step].key === 'exchange' && (
              <div className="space-y-2.5">
                {EXCHANGE_OPTIONS.map((opt) => {
                  const selected = data.exchangePrefs.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => update({ exchangePrefs: toggleArrayItem(data.exchangePrefs, opt.value) })}
                      className={`flex items-center justify-between w-full p-4 rounded-xl border text-left transition-all ${
                        selected ? 'border-accent bg-surface-3' : 'border-border bg-surface-2 hover:border-border-2'
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{opt.label}</p>
                        <p className="text-text-muted text-xs">{opt.desc}</p>
                      </div>
                      {selected && <Check className="w-5 h-5 text-text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm font-medium disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {isLastStep ? (
              <button
                onClick={handleComplete}
                disabled={saving || !canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-text rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? 'Setting up...' : 'Complete Setup'}
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-accent text-accent-text rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
