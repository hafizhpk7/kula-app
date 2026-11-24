import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/** Redirect yang membawa query string (`<Navigate>` biasa membuangnya), mis. ?kpsp= dan ?ukur=. */
export const AlihkanDenganQuery: React.FC<{ ke: string }> = ({ ke }) => {
  const { search } = useLocation();
  return <Navigate to={`${ke}${search}`} replace />;
};
