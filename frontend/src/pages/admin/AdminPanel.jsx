import React, { useEffect, useState } from 'react';
import { listUsersByRole, updateUser, getUser } from '../../services/users';

export default function AdminPanel() {
  const [students, setStudents] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [s, r] = await Promise.all([
          listUsersByRole('student'),
          listUsersByRole('recruiter'),
        ]);
        setStudents(s);
        setRecruiters(r);
      } catch {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const promoteToAdmin = async (uid) => {
    try { await updateUser(uid, { role: 'admin' }); alert('User promoted to admin'); } catch {}
  };

  const verifyRecruiter = async (uid) => {
    try { await updateUser(uid, { recruiterVerified: true }); alert('Recruiter verified'); } catch {}
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 grid gap-6 md:grid-cols-2">
      <div>
        <h2 className="text-xl font-semibold mb-2">Students</h2>
        <ul className="divide-y">
          {students.map(u => (
            <li key={u.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.email}</div>
                <div className="text-xs text-gray-600">{u.id}</div>
              </div>
              <button onClick={() => promoteToAdmin(u.id)} className="text-blue-600">Promote to admin</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Recruiters</h2>
        <ul className="divide-y">
          {recruiters.map(u => (
            <li key={u.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.email}</div>
                <div className="text-xs text-gray-600">{u.id}</div>
                <div className="text-xs">Verified: {String(u.recruiterVerified === true)}</div>
              </div>
              <button onClick={() => verifyRecruiter(u.id)} className="text-green-700">Promote to recruiter</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


