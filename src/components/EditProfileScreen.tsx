import React, { useState, useEffect, useRef } from "react";
import { ScreenId } from "../types";
import { ArrowLeft, Camera, Save, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";

interface EditProfileScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function EditProfileScreen({ onNavigate }: EditProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    plate: "",
    company: "",
    photoURL: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            name: data.name || user.displayName || "",
            cpf: data.cpf || "",
            plate: data.plate || "",
            company: data.company || "",
            photoURL: data.photoURL || user.photoURL || "",
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., max 1MB for Firestore base64 string safety)
    if (file.size > 1024 * 1024) {
      setErrorMsg("A imagem deve ter no máximo 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData({ ...formData, photoURL: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    const user = auth.currentUser;

    if (!user) {
      setErrorMsg("Usuário não autenticado.");
      setSaving(false);
      return;
    }

    try {
      // 1. Update Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        cpf: formData.cpf,
        plate: formData.plate,
        company: formData.company,
        photoURL: formData.photoURL,
      }, { merge: true });

      // 2. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: formData.name,
        photoURL: formData.photoURL || null,
      });

      setSuccessMsg("Perfil atualizado com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e: any) {
      setErrorMsg("Erro ao salvar perfil. Tente novamente.");
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSuccessMsg("Email de redefinição enviado!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      setErrorMsg("Erro ao enviar email de redefinição.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-blue-950 text-white px-6 py-6 pb-8 rounded-b-3xl shadow-md relative z-10 flex items-center gap-4">
        <button
          onClick={() => onNavigate(ScreenId.MyAccount)}
          className="p-2 -ml-2 bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-lg font-black tracking-wide">Editar Perfil</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 relative -top-4">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center">
            <div 
              className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-900 font-black text-3xl uppercase">
                  {formData.name.charAt(0) || "M"}
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-bold tracking-wide">Tocar para alterar foto</p>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl flex items-center gap-2 text-xs font-bold border border-red-100">
              <AlertCircle className="w-4 h-4" /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center gap-2 text-xs font-bold border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome Completo</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">CPF</label>
              <input 
                type="text" 
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Placa do Veículo</label>
              <input 
                type="text" 
                name="plate"
                value={formData.plate}
                onChange={handleChange}
                placeholder="ABC-1234"
                className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Empresa / Transportadora</label>
              <input 
                type="text" 
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl text-sm font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 mt-4 transition"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </button>
          </form>

          {/* Reset Password */}
          <div className="pt-4 border-t border-slate-200 mt-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-3">Segurança</h4>
            <button
              type="button"
              onClick={handleResetPassword}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 text-slate-600 p-2 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-sm">Redefinir Senha por Email</span>
              </div>
            </button>
            <p className="text-[10px] text-slate-400 mt-2 px-1">
              Um link para criar uma nova senha será enviado para o seu email cadastrado.
            </p>
          </div>
          
          <div className="h-10"></div>
        </div>
      )}
    </div>
  );
}
