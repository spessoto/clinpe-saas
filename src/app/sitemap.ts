import type { MetadataRoute } from "next";
import { groq } from "next-sanity";

import { getAppUrl } from "@/lib/env";
import { sanityClient } from "@/lib/sanity/client";

type BlogPostSitemapEntry = {
  slug: string;
  updatedAt: string | null;
};

const blogPostsQuery = groq`
  *[_type == "post" && defined(slug.current)] {
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
  }
`;

function isSanityConfigError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}

async function getBlogPostsSafely() {
  try {
    return await sanityClient.fetch<BlogPostSitemapEntry[]>(blogPostsQuery);
  } catch (error) {
    if (isSanityConfigError(error)) {
      console.warn("Sanity dataset/project not found for sitemap generation.");
      return [];
    }

    throw error;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getAppUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/helpdesk`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contato`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/politica-de-privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/termos-de-uso`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  const blogPosts = await getBlogPostsSafely();

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...blogRoutes];
}
