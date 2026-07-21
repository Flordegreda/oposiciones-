export type ResumenPdfItem = {
  id: string;
  materiaId: string;
  materiaNombre: string;
  titulo: string;
  filename: string;
  sizeBytes: number;
};

export type ResumenPdfSection = {
  materiaId: string;
  materiaNombre: string;
  items: ResumenPdfItem[];
};
