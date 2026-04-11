import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import type { Member, Application } from '../types/member';
import { ArrowLeft, Loader2, AlertCircle, Building, CheckCircle2, XCircle, Edit3, Save, X } from 'lucide-react';

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  const [member, setMember] = useState<Member | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editMember, setEditMember] = useState<Partial<Member>>({});
  const [editApp, setEditApp] = useState<Partial<Application>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const [memberData, appData] = await Promise.all([
          membersApi.getMemberById(id),
          membersApi.getMemberApplication(id).catch(e => {
            if (e.message?.toLowerCase().includes('not found')) return null;
            throw e;
          })
        ]);
        
        if (isMounted) {
          setMember(memberData);
          setApplication(appData);
          setEditMember(memberData);
          if (appData) setEditApp(appData);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load member profile');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  const handleSave = async () => {
    if (!id || !member) return;
    setIsSaving(true);
    try {
      const mPayload = { ...editMember };
      delete mPayload.departments; // Not editable currently, prevent postgres ID constraints crashing
      const promises: Promise<any>[] = [membersApi.updateMember(id, mPayload)];
      
      const payload = { ...editApp };
      if (payload.date_of_birth && !payload.date_of_birth.includes('T')) payload.date_of_birth += 'T00:00:00Z';
      if (payload.member_signature_date && !payload.member_signature_date.includes('T')) payload.member_signature_date += 'T00:00:00Z';
      if (payload.pastor_signature_date && !payload.pastor_signature_date.includes('T')) payload.pastor_signature_date += 'T00:00:00Z';
      promises.push(membersApi.updateMemberApplication(id, payload as Application));
      
      await Promise.all(promises);
      
      setMember(editMember as Member);
      setApplication(payload as Application);
      
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (member) setEditMember(member);
    if (application) setEditApp(application);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="animate-pulse font-medium">Extracting member dossier...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col items-start">
        <Link to="/dashboard" className="flex items-center text-slate-500 hover:text-primary transition mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Directory
        </Link>
        <div className="w-full min-h-[40vh] p-8 bg-red-500/5 border-2 border-dashed border-red-500/30 rounded-3xl flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Failed to load payload</h3>
          <p className="text-red-500/80 mt-2">{error || 'Unknown network context.'}</p>
        </div>
      </div>
    );
  }

  // Helper bindings for inputs
  const mChange = (k: keyof Member, v: any) => setEditMember(prev => ({ ...prev, [k]: v }));
  const aChange = (k: keyof Application, v: any) => setEditApp(prev => ({ ...prev, [k]: v }));

  const BooleanCheck = ({ checked, label, appKey }: { checked: boolean, label: string, appKey?: keyof Application }) => (
    <label 
      className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${
        isEditing && appKey 
          ? 'cursor-pointer hover:bg-slate-100 hover:dark:bg-slate-800' 
          : ''
      } bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800`}
    >
      {isEditing && appKey ? (
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => aChange(appKey, e.target.checked)} 
          className="w-5 h-5 accent-primary cursor-pointer" 
        />
      ) : (
        checked ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
      )}
      <span className={`text-sm font-medium ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
    </label>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/dashboard" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-primary transition-colors bg-white dark:bg-white/5 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
          </Link>

          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button 
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors bg-white dark:bg-white/5 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <X className="w-4 h-4 mr-2" /> Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors py-2 px-4 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
                  {isSaving ? 'Saving...' : 'Save Details'}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center text-sm font-semibold text-primary hover:text-white transition-colors border border-primary/20 hover:bg-primary py-2 px-4 rounded-xl shadow-sm bg-white dark:bg-white/5"
              >
                <Edit3 className="w-4 h-4 mr-2" /> Edit Details
              </button>
            )}
          </div>
        </div>

        {/* Profile Card Block */}
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-accent"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start space-y-6 md:space-y-0 pl-4">
            <div className="flex-1 w-full max-w-md">
              {isEditing ? (
                <div className="flex gap-3 mb-3">
                  <input 
                    type="text" 
                    value={editMember.first_name || ''} 
                    onChange={e => mChange('first_name', e.target.value)} 
                    placeholder="First Name"
                    className="w-full text-2xl font-black tracking-tight text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1 border-2 border-transparent focus:border-primary outline-none"
                  />
                  <input 
                    type="text" 
                    value={editMember.last_name || ''} 
                    onChange={e => mChange('last_name', e.target.value)} 
                    placeholder="Last Name"
                    className="w-full text-2xl font-black tracking-tight text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1 border-2 border-transparent focus:border-primary outline-none"
                  />
                </div>
              ) : (
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {member.first_name} {member.last_name}
                </h1>
              )}
              
              <div className="flex items-center space-x-4 mt-3 flex-wrap gap-y-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  member.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                }`}>
                  {member.status || 'Unknown'}
                </span>
                
                {isEditing ? (
                  <div className="flex space-x-2 w-full mt-2">
                    <input 
                      type="text" 
                      value={editMember.email || ''} 
                      onChange={e => mChange('email', e.target.value)} 
                      placeholder="Email"
                      className="flex-1 text-sm font-medium text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1.5 border-2 border-transparent focus:border-primary outline-none"
                    />
                    <input 
                      type="text" 
                      value={editMember.phone || ''} 
                      onChange={e => mChange('phone', e.target.value)} 
                      placeholder="Phone"
                      className="flex-1 text-sm font-medium text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1.5 border-2 border-transparent focus:border-primary outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{member.email || 'No email'} • {member.phone || 'No phone'}</span>
                )}
              </div>
            </div>

            {/* Departments Highlight */}
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-w-[240px]">
              <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                <Building className="w-4 h-4 mr-2 text-primary" /> Active Departments
              </div>
              {member.departments && member.departments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {member.departments.map((dept, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white dark:bg-black/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                      {dept.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Not assigned to any departments.</p>
              )}
            </div>
          </div>
        </div>

        {/* Intake Form Data - Only show if exists or editing */}
        {(!application && !isEditing) ? (
           <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
             <AlertCircle className="w-10 h-10 text-slate-400 mb-3" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Intake Record Found</h3>
             <p className="text-slate-500 mt-1 max-w-md">This member was imported or created without submitting a full centralized intake application. Data is minimal.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pb-12">
            
            {/* Left Column */}
            <div className="space-y-8">
              <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center">
                   Demographics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <span className="text-slate-500 font-medium text-sm">Date of Birth</span>
                    {isEditing ? (
                      <input type="text" placeholder="YYYY-MM-DD" value={editApp.date_of_birth?.split('T')[0] || ''} onChange={e => aChange('date_of_birth', e.target.value)} className="w-1/2 text-right bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary" />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">
                        {application?.date_of_birth ? new Date(application.date_of_birth).toLocaleDateString() : 'N/A'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <span className="text-slate-500 font-medium text-sm">Marital Status</span>
                    {isEditing ? (
                      <input type="text" placeholder="Single, Married, Divorced" value={editApp.marital_status || ''} onChange={e => aChange('marital_status', e.target.value)} className="w-1/2 text-right bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary" />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">{application?.marital_status || 'N/A'}</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <span className="text-slate-500 font-medium text-sm">Spouse Name</span>
                    {isEditing ? (
                      <input type="text" placeholder="N/A" value={editApp.spouse_name || ''} onChange={e => aChange('spouse_name', e.target.value)} className="w-1/2 text-right bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary" />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">{application?.spouse_name || 'N/A'}</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <span className="text-slate-500 font-medium text-sm">Children</span>
                    {isEditing ? (
                      <input type="number" value={editApp.num_children || 0} onChange={e => aChange('num_children', parseInt(e.target.value) || 0)} className="w-16 text-right bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary" />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-200 font-semibold text-sm">{application?.num_children || 0}</span>
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Spiritual Context</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <BooleanCheck checked={!!editApp.born_again} label="Born Again" appKey="born_again" />
                  <BooleanCheck checked={!!editApp.water_baptized} label="Water Baptized" appKey="water_baptized" />
                  <BooleanCheck checked={!!editApp.speak_tongues} label="Speaks Tongues" appKey="speak_tongues" />
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Previous Church</span>
                  {isEditing ? (
                    <input type="text" placeholder="Previous Church Name" value={editApp.prev_church || ''} onChange={e => aChange('prev_church', e.target.value)} className="w-full text-left bg-white dark:bg-black/50 text-slate-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-primary border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <span className="text-slate-800 dark:text-slate-200 text-sm font-medium">{application?.prev_church || 'None'}</span>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <section className="bg-slate-900 dark:bg-black/60 rounded-3xl p-7 shadow-lg border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>
                <h3 className="text-lg font-bold text-white mb-5 relative z-10 flex items-center">
                  Commitment Agreements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                  <BooleanCheck checked={!!editApp.attendance_commitment} label="Attendance" appKey="attendance_commitment" />
                  <BooleanCheck checked={!!editApp.tithe_commitment} label="Tithe" appKey="tithe_commitment" />
                  <BooleanCheck checked={!!editApp.prayer_commitment} label="Active Prayer" appKey="prayer_commitment" />
                  <BooleanCheck checked={!!editApp.sober_commitment} label="Sober Lifestyle" appKey="sober_commitment" />
                  <BooleanCheck checked={!!editApp.respect_commitment} label="Leadership Respect" appKey="respect_commitment" />
                  <BooleanCheck checked={!!editApp.faith_commitment} label="Statement of Faith" appKey="faith_commitment" />
                </div>
              </section>

              <section className="bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-3xl p-7">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Signature History</h3>
                <div className="space-y-5">
                   <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                     <div className="flex-1">
                       <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Member Signed</div>
                       <div className="text-xs font-medium text-slate-500 mt-0.5">Agreement to Discipleship Terms</div>
                     </div>
                     {isEditing ? (
                        <input type="text" placeholder="YYYY-MM-DD" value={editApp.member_signature_date?.split('T')[0] || ''} onChange={e => aChange('member_signature_date', e.target.value)} className="w-28 text-right bg-white dark:bg-black/50 text-slate-900 dark:text-white px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary text-sm font-semibold border border-slate-200 dark:border-slate-700" />
                     ) : (
                       <span className="text-sm font-semibold text-primary ml-4">
                         {application?.member_signature_date ? new Date(application.member_signature_date).toLocaleDateString() : 'Pending'}
                       </span>
                     )}
                   </div>
                   
                   <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Pastor Review</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">Administrative Approval</div>
                      </div>
                      {isEditing ? (
                        <input type="text" placeholder="YYYY-MM-DD" value={editApp.pastor_signature_date?.split('T')[0] || ''} onChange={e => aChange('pastor_signature_date', e.target.value)} className="w-28 text-right bg-white dark:bg-black/50 text-slate-900 dark:text-white px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary text-sm font-semibold border border-slate-200 dark:border-slate-700" />
                     ) : (
                        <span className="text-sm font-semibold text-accent ml-4">
                          {application?.pastor_signature_date ? new Date(application.pastor_signature_date).toLocaleDateString() : 'Awaiting Approval'}
                        </span>
                      )}
                    </div>
                </div>
              </section>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
};

export default MemberDetail;
