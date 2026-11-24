import { useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useFamily } from "../../../shell/family/context/FamilyContext";
import { useToast } from "../../../components/common/Toast";
import { BayiRepository } from "./types";
import { LocalBayiRepository } from "./LocalBayiRepository";
import { PersonalCloudBayiRepository } from "./PersonalCloudBayiRepository";
import { FamilyBayiRepository, payloadJurnalKeluarga } from "./FamilyBayiRepository";
import { db } from "../../../services/firebase";
import { LayananFotoMomen, LayananFotoTamu, layananKeluarga, layananPribadi } from "../momen/foto/layanan";
import { tokoFotoPerangkat } from "../momen/foto/tokoLokal";

export function useBayiRepository(): {
  repository: BayiRepository;
  /** Foto momen (R3b). Selalu ada; dipakai hanya bila flag fotoMomen menyala. */
  fotoMomen: LayananFotoMomen;
  mode: "guest" | "personal" | "family";
  familyId?: string;
  isAdmin: boolean;
} {
  const { user, setCloudSyncStatus, markSynced } = useAuth();
  const { status, family, isAdmin } = useFamily();
  const { showToast } = useToast();

  const isFamilyActive = user && status === "active" && Boolean(family?.id);

  const mode: "guest" | "personal" | "family" = !user
    ? "guest"
    : isFamilyActive
    ? "family"
    : "personal";

  const repository = useMemo<BayiRepository>(() => {
    if (!user) {
      return new LocalBayiRepository();
    }
    if (isFamilyActive && family?.id) {
      return new FamilyBayiRepository(family.id, user.uid, isAdmin);
    }
    return new PersonalCloudBayiRepository(user.uid, setCloudSyncStatus, markSynced, showToast);
  }, [user, isFamilyActive, family?.id, isAdmin, setCloudSyncStatus, markSynced, showToast]);

  const fotoMomen = useMemo<LayananFotoMomen>(() => {
    const toko = tokoFotoPerangkat();
    if (!user) return new LayananFotoTamu(toko);
    if (isFamilyActive && family?.id) return layananKeluarga(db, user.uid, family.id, toko, (e) => payloadJurnalKeluarga(e, user.uid));
    return layananPribadi(db, user.uid, toko);
  }, [user, isFamilyActive, family?.id]);

  return {
    repository,
    fotoMomen,
    mode,
    familyId: family?.id,
    isAdmin
  };
}
