export interface updateUserDTO {
  name?: string | undefined;
  image?: string | null | undefined;
}

export interface userResponseDTO {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}
