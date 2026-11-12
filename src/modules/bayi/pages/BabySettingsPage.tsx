import React from "react";
import { useOutletContext } from "react-router-dom";
import { BabySettingsTab } from "../components/BabySettingsTab";

export const BabySettingsPage: React.FC = () => {
  const { setProfileModalOpen, setProfileModalMode } = useOutletContext<any>();
  return (
    <BabySettingsTab
      onManageProfiles={() => {
        setProfileModalMode("list");
        setProfileModalOpen(true);
      }}
      onAddChild={() => {
        setProfileModalMode("add");
        setProfileModalOpen(true);
      }}
    />
  );
};
