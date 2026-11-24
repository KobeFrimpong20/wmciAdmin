import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  QrCode,
} from 'lucide-react';
import { membersApi } from '../api/members';
import type { IntakeFormPayload } from '../types/member';
import { PageShell } from '../components/PageShell';
import { Button } from '../components/Button';
import { buttonStyles } from '../components/buttonStyles';

const STEPS = ['Personal Info', 'Demographics', 'Spiritual Background', 'Commitments'];

const INTAKE_URL = `${window.location.origin}/intake`;

const inputCls =
  'w-full px-3.5 py-2.5 bg-surface border border-border rounded-sm font-body text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors duration-150';

const labelCls = 'block font-body text-sm font-medium text-foreground mb-1.5';

function createInitialForm(): IntakeFormPayload {
  return {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    marital_status: '',
    spouse_name: '',
    num_children: 0,
    born_again: false,
    water_baptized: false,
    speak_tongues: false,
    prev_church: '',
    attendance_commitment: false,
    tithe_commitment: false,
    prayer_commitment: false,
    sober_commitment: false,
    respect_commitment: false,
    faith_commitment: false,
    member_signature_date: new Date().toISOString().split('T')[0],
  };
}

const COMMITMENTS: { key: keyof IntakeFormPayload; label: string }[] = [
  {
    key: 'attendance_commitment',
    label: 'I commit to regular attendance and active participation in the church.',
  },
  {
    key: 'tithe_commitment',
    label: 'I commit to supporting the church through faithful tithing.',
  },
  {
    key: 'prayer_commitment',
    label: 'I commit to maintaining a personal prayer life.',
  },
  {
    key: 'sober_commitment',
    label: 'I commit to living a sober and self-controlled lifestyle.',
  },
  {
    key: 'respect_commitment',
    label: 'I commit to treating all members with respect and dignity.',
  },
  {
    key: 'faith_commitment',
    label: 'I commit to growing in my faith through study and fellowship.',
  },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol
      aria-label="Application progress"
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-6 mb-6 border-b border-border"
    >
      {STEPS.map((label, i) => {
        const isCompleted = i < current;
        const isCurrent = i === current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex items-center gap-2 min-w-0"
          >
            <span
              className={`font-accent text-xs w-6 h-6 shrink-0 rounded-sm flex items-center justify-center tabular-nums border ${
                isCompleted
                  ? 'bg-accent text-accent-foreground border-accent'
                  : isCurrent
                    ? 'bg-accent-wash text-accent border-accent font-medium'
                    : 'bg-paper text-muted-foreground border-border'
              }`}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={`text-xs truncate ${
                isCurrent
                  ? 'text-accent font-medium'
                  : isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ShareLinkPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="bg-surface border border-border rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5 min-w-0">
        <QrCode className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 className="font-heading text-lg font-normal text-foreground leading-snug">
            Share Registration Form
          </h2>
          <p className="text-sm text-muted-foreground">
            Direct new members to{' '}
            <a
              href={url}
              className="font-accent text-xs text-accent hover:text-accent-hover underline break-all"
            >
              {url}
            </a>
            .
          </p>
        </div>
      </div>

      <Button variant="secondary" onClick={handleCopy} className="shrink-0">
        {copied ? (
          <>
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Link Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" aria-hidden="true" />
            <span>Copy Form Link</span>
          </>
        )}
      </Button>
    </section>
  );
}

function Step1({
  form,
  onChange,
}: {
  form: IntakeFormPayload;
  onChange: (k: keyof IntakeFormPayload, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="intake-first-name" className={labelCls}>
            First Name <span className="text-accent">*</span>
          </label>
          <input
            id="intake-first-name"
            type="text"
            autoComplete="given-name"
            className={inputCls}
            value={form.first_name}
            onChange={e => onChange('first_name', e.target.value)}
            placeholder="Grace"
            required
          />
        </div>
        <div>
          <label htmlFor="intake-last-name" className={labelCls}>
            Last Name <span className="text-accent">*</span>
          </label>
          <input
            id="intake-last-name"
            type="text"
            autoComplete="family-name"
            className={inputCls}
            value={form.last_name}
            onChange={e => onChange('last_name', e.target.value)}
            placeholder="Mensah"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="intake-email" className={labelCls}>
          Email Address
        </label>
        <input
          id="intake-email"
          type="email"
          autoComplete="email"
          className={inputCls}
          value={form.email}
          onChange={e => onChange('email', e.target.value)}
          placeholder="grace.mensah@example.com"
        />
      </div>

      <div>
        <label htmlFor="intake-phone" className={labelCls}>
          Phone Number
        </label>
        <input
          id="intake-phone"
          type="tel"
          autoComplete="tel"
          className={inputCls}
          value={form.phone}
          onChange={e => onChange('phone', e.target.value)}
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div>
        <label htmlFor="intake-address" className={labelCls}>
          Residential Address
        </label>
        <input
          id="intake-address"
          type="text"
          autoComplete="street-address"
          className={inputCls}
          value={form.address}
          onChange={e => onChange('address', e.target.value)}
          placeholder="123 Main St, City, State"
        />
      </div>
    </div>
  );
}

function Step2({
  form,
  onChange,
}: {
  form: IntakeFormPayload;
  onChange: (k: keyof IntakeFormPayload, v: string | number) => void;
}) {
  const showSpouse = form.marital_status === 'married' || form.marital_status === 'widowed';

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="intake-dob" className={labelCls}>
          Date of Birth <span className="text-accent">*</span>
        </label>
        <input
          id="intake-dob"
          type="date"
          className={inputCls}
          value={form.date_of_birth}
          onChange={e => onChange('date_of_birth', e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="intake-marital-status" className={labelCls}>
          Marital Status
        </label>
        <select
          id="intake-marital-status"
          className={inputCls}
          value={form.marital_status}
          onChange={e => onChange('marital_status', e.target.value)}
        >
          <option value="">Select status</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
        </select>
      </div>

      {showSpouse && (
        <div>
          <label htmlFor="intake-spouse" className={labelCls}>
            Spouse&apos;s Name
          </label>
          <input
            id="intake-spouse"
            type="text"
            className={inputCls}
            value={form.spouse_name}
            onChange={e => onChange('spouse_name', e.target.value)}
            placeholder="Full name of spouse"
          />
        </div>
      )}

      <div>
        <label htmlFor="intake-children" className={labelCls}>
          Number of Children
        </label>
        <input
          id="intake-children"
          type="number"
          min={0}
          className={inputCls}
          value={form.num_children}
          onChange={e => onChange('num_children', Math.max(0, parseInt(e.target.value, 10) || 0))}
        />
      </div>
    </div>
  );
}

function Step3({
  form,
  onBool,
  onChange,
}: {
  form: IntakeFormPayload;
  onBool: (k: keyof IntakeFormPayload, v: boolean) => void;
  onChange: (k: keyof IntakeFormPayload, v: string) => void;
}) {
  const boolQuestions: { key: keyof IntakeFormPayload; label: string }[] = [
    { key: 'born_again', label: 'Are you born again?' },
    { key: 'water_baptized', label: 'Have you been water baptized?' },
    { key: 'speak_tongues', label: 'Do you speak in tongues?' },
  ];

  return (
    <div className="space-y-6">
      <div className="divide-y divide-border">
        {boolQuestions.map(({ key, label }) => (
          <div
            key={key}
            className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <span className="text-sm font-medium text-foreground">{label}</span>
            <div className="inline-flex items-center gap-2">
              {[true, false].map(val => {
                const selected = form[key] === val;
                return (
                  <button
                    key={String(val)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onBool(key, val)}
                    className={`px-4 py-1.5 rounded-sm text-sm font-medium border transition-colors duration-150 cursor-pointer ${
                      selected
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-surface text-muted-foreground border-border hover:bg-accent-wash hover:text-accent hover:border-accent'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="intake-prev-church" className={labelCls}>
          Previous Church
        </label>
        <input
          id="intake-prev-church"
          type="text"
          className={inputCls}
          value={form.prev_church}
          onChange={e => onChange('prev_church', e.target.value)}
          placeholder="Name of previous church, if any"
        />
      </div>
    </div>
  );
}

function Step4({
  form,
  onBool,
  onChange,
}: {
  form: IntakeFormPayload;
  onBool: (k: keyof IntakeFormPayload, v: boolean) => void;
  onChange: (k: keyof IntakeFormPayload, v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Check each commitment below to affirm your agreement as a member of the congregation.
      </p>

      <div className="divide-y divide-border border-t border-b border-border">
        {COMMITMENTS.map(({ key, label }) => (
          <label
            key={key}
            className="py-4 flex items-start gap-3 cursor-pointer transition-colors duration-150 hover:text-accent"
          >
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={e => onBool(key, e.target.checked)}
              className="mt-1 h-4 w-4 rounded-sm border-border accent-accent shrink-0 cursor-pointer"
            />
            <span className="text-sm text-foreground leading-relaxed">{label}</span>
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="intake-signature-date" className={labelCls}>
          Signature Date
        </label>
        <input
          id="intake-signature-date"
          type="date"
          className={inputCls}
          value={form.member_signature_date || ''}
          onChange={e => onChange('member_signature_date', e.target.value)}
        />
      </div>
    </div>
  );
}

function SuccessScreen({ name, onReset }: { name: string; onReset: () => void }) {
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-start gap-3.5">
        <CheckCircle2 className="w-6 h-6 text-accent shrink-0 mt-1" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-normal text-foreground">
            Application Received
          </h2>
          <p className="text-base text-muted-foreground max-w-xl">
            Thank you, <span className="text-foreground font-medium">{name}</span>. Your membership
            application has been recorded in the Digital Binder and is pending pastoral review.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground pt-5 border-t border-border">
        A department lead or pastor will follow up with you once your application has been reviewed.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link to="/" className={buttonStyles('primary')}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Return to Directory</span>
        </Link>
        <Button variant="secondary" onClick={onReset}>
          Start Another Application
        </Button>
      </div>
    </div>
  );
}

const IntakePage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakeFormPayload>(() => createInitialForm());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (key: keyof IntakeFormPayload, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validateStep = (): string => {
    if (step === 0) {
      if (!form.first_name.trim()) return 'Please enter a first name before continuing.';
      if (!form.last_name.trim()) return 'Please enter a last name before continuing.';
    }
    if (step === 1) {
      if (!form.date_of_birth) return 'Please select a date of birth before continuing.';
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await membersApi.submitIntake(form);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not submit the application. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(createInitialForm());
    setStep(0);
    setError('');
    setSubmitted(false);
  };

  return (
    <PageShell width="reference">
      <div className="space-y-8">
        {/* Page Header */}
        <header className="space-y-2">
          <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground leading-tight">
            Membership Application
          </h1>
          <p className="text-base text-muted-foreground max-w-xl">
            Complete the four sections below to submit an intake record for pastoral review.
          </p>
        </header>

        {/* Share Registration Link */}
        <ShareLinkPanel url={INTAKE_URL} />

        {/* Validation / Submission Error Banner (separate top-level surface) */}
        {error && !submitted && (
          <div
            role="alert"
            className="bg-surface border border-foreground rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
        )}

        {/* Form Surface */}
        <section className="bg-surface border border-border rounded-lg p-6 sm:p-8">
          {submitted ? (
            <SuccessScreen
              name={`${form.first_name} ${form.last_name}`.trim()}
              onReset={handleReset}
            />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <StepIndicator current={step} />

              <h2 className="font-heading text-2xl font-normal text-foreground mb-5">
                {STEPS[step]}
              </h2>

              {step === 0 && (
                <Step1 form={form} onChange={(k, v) => handleChange(k, v)} />
              )}
              {step === 1 && (
                <Step2 form={form} onChange={(k, v) => handleChange(k, v)} />
              )}
              {step === 2 && (
                <Step3
                  form={form}
                  onBool={(k, v) => handleChange(k, v)}
                  onChange={(k, v) => handleChange(k, v)}
                />
              )}
              {step === 3 && (
                <Step4
                  form={form}
                  onBool={(k, v) => handleChange(k, v)}
                  onChange={(k, v) => handleChange(k, v)}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
                {step > 0 ? (
                  <Button variant="secondary" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Back to {STEPS[step - 1]}</span>
                  </Button>
                ) : (
                  <div />
                )}

                {step < STEPS.length - 1 ? (
                  <Button variant="primary" onClick={handleNext}>
                    <span>Continue to {STEPS[step + 1]}</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <span>Submit Membership Application</span>
                    )}
                  </Button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </PageShell>
  );
};

export default IntakePage;
