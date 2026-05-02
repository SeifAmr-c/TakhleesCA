import { api } from "./client.js";

const todayIso = () => new Date().toISOString().slice(0, 10);

export const createDocumentRecord = async ({
  DocType,
  ClientID = null,
  ApplicationID = null,
  VerficationStatus = "Pending",
  UploadDate = todayIso(),
}) => {
  const { data } = await api.post("/document", {
    DocType,
    UploadDate,
    VerficationStatus,
    ClientID,
    ApplicationID,
  });
  return data;
};
