// Lightweight programmatic logout confirmation modal
export default function showLogoutConfirm(message = 'Are you sure you want to logout?') {
  return new Promise((resolve) => {
    try {
      const overlay = document.createElement('div');
      overlay.setAttribute('role', 'dialog');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.45)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';

      const modal = document.createElement('div');
      modal.style.background = '#ffffff';
      modal.style.padding = '20px';
      modal.style.borderRadius = '10px';
      modal.style.maxWidth = '480px';
      modal.style.width = '90%';
      modal.style.boxShadow = '0 12px 40px rgba(2,6,23,0.2)';
      modal.style.fontFamily = 'Inter, system-ui, Arial, sans-serif';
      modal.innerHTML = `
        <div style="font-size:16px;font-weight:600;color:#111827;margin-bottom:8px;">${message}</div>
        <div style="color:#6b7280;font-size:13px;margin-bottom:14px;">You will be signed out from this device.</div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;">
          <button id="logout-cancel" style="padding:8px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#111827;cursor:pointer;">Cancel</button>
          <button id="logout-confirm" style="padding:8px 14px;border-radius:8px;border:0;background:#ef4444;color:#fff;cursor:pointer;">Logout</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const cleanup = () => {
        try { document.body.removeChild(overlay); } catch (_) {}
        window.removeEventListener('keydown', onKey);
      };

      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      const btnConfirm = modal.querySelector('#logout-confirm');
      const btnCancel = modal.querySelector('#logout-cancel');
      if (btnConfirm) btnConfirm.addEventListener('click', onConfirm);
      if (btnCancel) btnCancel.addEventListener('click', onCancel);

      const onKey = (e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter') onConfirm();
      };
      window.addEventListener('keydown', onKey);
    } catch (err) {
      // Fallback to native confirm if DOM operations fail
      const r = window.confirm(message);
      resolve(Boolean(r));
    }
  });
}

