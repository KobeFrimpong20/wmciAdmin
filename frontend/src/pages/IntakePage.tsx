import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Loader2, QrCode, Copy, Check } from 'lucide-react';
import { membersApi } from '../api/members';
import type { IntakeFormPayload } from '../types/member';

const STEPS = ['Personal Info', 'Demographics', 'Spiritual Background', 'Commitments'];

const INTAKE_URL = `${window.location.origin}/intake`;

const initialForm: IntakeFormPayload = {
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

const COMMITMENTS: { key: keyof IntakeFormPayload; label: string }[] = [
  { key: 'attendance_commitment', label: 'I commit to regular attendance and active participation in the church.' },
  { key: 'tithe_commitment', label: 'I commit to supporting the church through faithful tithing.' },
  { key: 'prayer_commitment', label: 'I commit to maintaining a personal prayer life.' },
  { key: 'sober_commitment', label: 'I commit to living a sober and self-controlled lifestyle.' },
  { key: 'respect_commitment', label: 'I commit to treating all members with respect and dignity.' },
  { key: 'faith_commitment', label: 'I commit to growing in my faith through study and fellowship.' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < current
                  ? 'bg-primary text-white'
                  : i === current
                  ? 'bg-gradient-to-br from-primary to-accent text-white shadow-lg scale-110'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === current ? 'text-primary font-medium' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 sm:w-12 mt-[-16px] transition-all ${i < current ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function MockQRCode({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center gap-4">
      {/* Mock QR Code */}
      <div className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
        <QrCode className="w-8 h-8 mb-1" />
        <span className="text-[10px] text-center leading-tight">Scan to<br />Register</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Share This Form</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          New members can scan the QR code or use the link below to fill out this form.
        </p>
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <span className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1 font-mono">{url}</span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors"
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({ form, onChange }: { form: IntakeFormPayload; onChange: (k: keyof IntakeFormPayload, v: string) => void }) {
  const inputCls = "w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500 text-sm";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">First Name <span className="text-red-400">*</span></label>
          <input className={inputCls} value={form.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="John" required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Last Name <span className="text-red-400">*</span></label>
          <input className={inputCls} value={form.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Doe" required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
        <input type="email" className={inputCls} value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="john.doe@example.com" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
        <input type="tel" className={inputCls} value={form.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Address</label>
        <input className={inputCls} value={form.address} onChange={e => onChange('address', e.target.value)} placeholder="123 Main St, City, State" />
      </div>
    </div>
  );
}

function Step2({ form, onChange }: { form: IntakeFormPayload; onChange: (k: keyof IntakeFormPayload, v: string | number) => void }) {
  const inputCls = "w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500 text-sm";
  const selectCls = inputCls + " appearance-none";
  const showSpouse = form.marital_status === 'married' || form.marital_status === 'widowed';

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Date of Birth <span className="text-red-400">*</span></label>
        <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => onChange('date_of_birth', e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Marital Status</label>
        <select className={selectCls} value={form.marital_status} onChange={e => onChange('marital_status', e.target.value)}>
          <option value="">Select status</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
        </select>
      </div>
      {showSpouse && (
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Spouse's Name</label>
          <input className={inputCls} value={form.spouse_name} onChange={e => onChange('spouse_name', e.target.value)} placeholder="Jane Doe" />
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Number of Children</label>
        <input type="number" min={0} className={inputCls} value={form.num_children} onChange={e => onChange('num_children', parseInt(e.target.value) || 0)} />
      </div>
    </div>
  );
}

function Step3({ form, onBool, onChange }: { form: IntakeFormPayload; onBool: (k: keyof IntakeFormPayload, v: boolean) => void; onChange: (k: keyof IntakeFormPayload, v: string) => void }) {
  const inputCls = "w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500 text-sm";

  const boolField = (key: keyof IntakeFormPayload, label: string) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex gap-2">
        {[true, false].map(val => (
          <button
            key={String(val)}
            type="button"
            onClick={() => onBool(key, val)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              form[key] === val
                ? val ? 'bg-green-500 text-white shadow' : 'bg-red-400 text-white shadow'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {val ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {boolField('born_again', 'Are you born again?')}
      {boolField('water_baptized', 'Have you been water baptized?')}
      {boolField('speak_tongues', 'Do you speak in tongues?')}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Previous Church</label>
        <input className={inputCls} value={form.prev_church} onChange={e => onChange('prev_church', e.target.value)} placeholder="Name of previous church (if any)" />
      </div>
    </div>
  );
}

function Step4({ form, onBool }: { form: IntakeFormPayload; onBool: (k: keyof IntakeFormPayload, v: boolean) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        By checking each commitment below, you agree to uphold these principles as a member of this church.
      </p>
      {COMMITMENTS.map(({ key, label }) => (
        <label
          key={key}
          className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
            form[key]
              ? 'border-primary/50 bg-primary/5'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5'
          }`}
        >
          <input
            type="checkbox"
            checked={form[key] as boolean}
            onChange={e => onBool(key, e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/50 flex-shrink-0"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        </label>
      ))}
    </div>
  );
}

function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        Thank you, <span className="font-semibold text-slate-700 dark:text-slate-300">{name}</span>. Your membership application has been received and is pending review by our team.
      </p>
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
        You will be contacted once your application has been approved.
      </div>
    </div>
  );
}

const IntakePage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakeFormPayload>(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (key: keyof IntakeFormPayload, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validateStep = (): string => {
    if (step === 0) {
      if (!form.first_name.trim()) return 'First name is required.';
      if (!form.last_name.trim()) return 'Last name is required.';
    }
    if (step === 1) {
      if (!form.date_of_birth) return 'Date of birth is required.';
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
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
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Membership Application</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Fill out this form to begin your journey with our church family.</p>
        </div>

        {/* QR / Share section */}
        <MockQRCode url={INTAKE_URL} />

        {/* Form card */}
        <div className="bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            {submitted ? (
              <SuccessScreen name={`${form.first_name} ${form.last_name}`} />
            ) : (
              <form onSubmit={handleSubmit}>
                <StepIndicator current={step} total={STEPS.length} />

                <h2 className="text-lg font-semibold mb-5 text-slate-800 dark:text-slate-200">{STEPS[step]}</h2>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2">
                    <AlertCircle className="text-red-500 w-4 h-4 flex-shrink-0" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                {step === 0 && (
                  <Step1
                    form={form}
                    onChange={(k, v) => handleChange(k, v)}
                  />
                )}
                {step === 1 && (
                  <Step2
                    form={form}
                    onChange={(k, v) => handleChange(k, v)}
                  />
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
                  />
                )}

                <div className="flex justify-between mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-1 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : <div />}

                  {step < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-all shadow"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-all shadow disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Application'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>&copy; 2026 Member Binder. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default IntakePage;
