import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/content-cache";

export function revalidateContentCache() {
  revalidateTag(CACHE_TAGS.temario);
  revalidateTag(CACHE_TAGS.materialStats);
}
