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

export const uploadDocument = async ({ DocType, ApplicationID, file }) => {
  const formData = new FormData();
  formData.append("DocType", DocType);
  formData.append("ApplicationID", String(ApplicationID));
  formData.append("file", file);
  const { data } = await api.post("/document/upload", formData, {
    headers: { "Content-Type": undefined },
  });
  return data;
};

export const listApplicationDocuments = async (applicationId) => {
  const { data } = await api.get("/document/by-application", {
    params: { ApplicationID: applicationId },
  });
  return data;
};
