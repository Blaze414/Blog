export type ArtVariant = "house" | "gift" | "shelf" | "type" | "weekend" | "city";

export type MediaAsset = {
  readonly id: string;
  readonly articleId: string;
  readonly title: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption: string;
  readonly articleSlug: string;
  readonly portrait?: boolean;
};

export type BlogImage = MediaAsset & {
  readonly afterParagraph: number;
};

export type DocumentExtension = "pptx" | "docx" | "xlsx" | "csv" | "pdf";

export type DocumentAsset = {
  readonly id: string;
  readonly articleId: string;
  readonly articleSlug: string;
  readonly title: string;
  readonly filename: string;
  readonly src: string;
  readonly extension: DocumentExtension;
  readonly mimeType: string;
  readonly size: number;
  readonly caption: string;
};

export type BlogDocument = DocumentAsset & {
  readonly afterParagraph: number;
};

export type BlogListItem = {
  readonly label?: string;
  readonly text: string;
};

export type BlogReference = {
  readonly label: string;
  readonly url: string;
};

export type BlogSection = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly quote?: string;
  readonly list?: readonly BlogListItem[];
  readonly listStyle?: "ordered" | "unordered";
  readonly references?: readonly BlogReference[];
  readonly images?: readonly BlogImage[];
  readonly documents?: readonly BlogDocument[];
};

export type BlogPost = {
  readonly id: string;
  readonly slug: string;
  readonly featuredRank?: number;
  readonly category: string;
  readonly title: string;
  readonly summary: string;
  readonly date: string;
  readonly author: string;
  readonly tags: readonly string[];
  readonly accent: "sky" | "coral" | "teal" | "navy";
  readonly art: ArtVariant;
  readonly artLabel?: string;
  readonly heroImage?: BlogImage;
  readonly kicker?: string;
  readonly sections: readonly BlogSection[];
  readonly related: readonly string[];
};

export type CategoryDefinition = {
  readonly name: string;
  readonly anchor: string;
  readonly navigationLabel: string;
};
