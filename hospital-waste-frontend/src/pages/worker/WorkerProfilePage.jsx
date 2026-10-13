import React from 'react';
import { User, Shield, Phone, Mail, Building, Truck } from 'lucide-react';

const WorkerProfilePage = () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1>My Profile</h1>
        <p>Worker identity and system access details</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(241, 196, 15, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={36} color="var(--yellow-bin)" />
          </div>
          <div>
            <h2>{currentUser.name || 'Worker User'}</h2>
            <p style={{ margin: 0 }}>Role: <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>Worker</span></p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full Name</span>
            <p style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}>{currentUser.name || 'Worker User'}</p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Employee Username</span>
            <p style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}><code>{currentUser.username || 'workername'}</code></p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Address</span>
            <p style={{ fontSize: '0.95rem', marginTop: '0.2rem' }}>{currentUser.email || 'worker@hospital.com'}</p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone Number</span>
            <p style={{ fontSize: '0.95rem', marginTop: '0.2rem' }}>{currentUser.phone || '+91 9876543212'}</p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>System Role</span>
            <p style={{ fontWeight: 600, color: 'var(--yellow-bin)', marginTop: '0.2rem' }}>Biomedical Waste Collection Worker</p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Department / Hospital</span>
            <p style={{ fontSize: '0.95rem', marginTop: '0.2rem' }}>{currentUser.department || 'Logistics / Central Hospital'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfilePage;
