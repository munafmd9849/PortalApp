import React, { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import LoginModal from "../components/landing/LoginModal";
import ClickSpark from "../components/landing/ClickSpark";

export default function AuthPage({ defaultMode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const role = useMemo(() => {
    const fromState = location.state?.role;
    const fromQuery = params.get("role");
    const value = fromState || fromQuery || "Student";
    if (value === "Recruiter" || value === "Admin" || value === "Student") return value;
    return "Student";
  }, [location.state, params]);

  const mode = useMemo(() => {
    const fromQuery = params.get("mode");
    const value = (fromQuery || defaultMode || "login").toLowerCase();
    if (value === "register" || value === "signup") return "register";
    if (value === "forgot") return "forgot";
    return "login";
  }, [params, defaultMode]);

  return (
    <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={18} sparkCount={10} duration={420}>
      <div className="min-h-screen w-full bg-[#FFF7E6]">
        <LoginModal
          isOpen={true}
          asPage={true}
          defaultRole={role}
          defaultMode={mode}
          onClose={() => navigate("/", { replace: true })}
        />
      </div>
    </ClickSpark>
  );
}

