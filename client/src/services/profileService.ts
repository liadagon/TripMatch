import api from "./api";

type FileUploadResponse = {
  success: true;
  url: string;
};

export const uploadProfileImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const uploadResponse = await api.post<FileUploadResponse>("/api/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  await api.put("/api/users/me", { photoURL: uploadResponse.data.url });
  return uploadResponse.data.url;
};
