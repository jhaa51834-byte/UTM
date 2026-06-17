import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setTokens, clearAuth, isAuthenticated, setOrgId, getOrgId } from "./api";

interface User {
  email: string;
  full_name: string;
  org_id: string | null;
  org_name: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName: string) => Promise<void>;
  logout: () => void;
  orgId: string | null;
  switchOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [orgId, setOrgIdState] = useState<string | null>(getOrgId());

  useEffect(() => {
    if (isAuthenticated()) {
      // Decode JWT to get user info (simplified)
      try {
        const token = localStorage.getItem("tf_access_token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUser({
            email: payload.email || "",
            full_name: payload.name || "",
            org_id: payload.org_id || orgId,
            org_name: null,
          });
          if (payload.org_id && !orgId) {
            setOrgId(payload.org_id);
            setOrgIdState(payload.org_id);
          }
        }
      } catch {
        // Token decode failed
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setTokens(res.access_token, res.refresh_token);
    setIsLoggedIn(true);
    // Decode org_id from token
    try {
      const payload = JSON.parse(atob(res.access_token.split(".")[1]));
      if (payload.org_id) {
        setOrgId(payload.org_id);
        setOrgIdState(payload.org_id);
      }
      setUser({
        email,
        full_name: payload.name || email.split("@")[0],
        org_id: payload.org_id || null,
        org_name: null,
      });
    } catch {
      setUser({ email, full_name: email.split("@")[0], org_id: null, org_name: null });
    }
  };

  const register = async (email: string, password: string, fullName: string, orgName: string) => {
    const res = await api.register({ email, password, full_name: fullName, org_name: orgName });
    setTokens(res.access_token, res.refresh_token);
    setIsLoggedIn(true);
    try {
      const payload = JSON.parse(atob(res.access_token.split(".")[1]));
      if (payload.org_id) {
        setOrgId(payload.org_id);
        setOrgIdState(payload.org_id);
      }
      setUser({ email, full_name: fullName, org_id: payload.org_id || null, org_name: orgName });
    } catch {
      setUser({ email, full_name: fullName, org_id: null, org_name: orgName });
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setIsLoggedIn(false);
    setOrgIdState(null);
  };

  const switchOrg = (newOrgId: string) => {
    setOrgId(newOrgId);
    setOrgIdState(newOrgId);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, register, logout, orgId, switchOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
