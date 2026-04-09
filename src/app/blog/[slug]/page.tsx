import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { groq } from "next-sanity";
import type { PortableTextBlock } from "@portabletext/types";
import { PortableText } from "@portabletext/react";

import { sanityClient } from "@/lib/sanity/client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type BlogPost = {
  title: string;
  excerpt: string | null;
  body: PortableTextBlock[];
  mainImageUrl: string | null;
};

const postQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    title,
    excerpt,
    body,
    "mainImageUrl": mainImage.asset->url
  }
`;

const postMetadataQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    title,
    excerpt
  }
`;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const post = await sanityClient.fetch<Pick<
    BlogPost,
    "title" | "excerpt"
  > | null>(postMetadataQuery, { slug });

  if (!post) {
    return {
      title: "Artigo não encontrado",
      description: "O artigo solicitado não foi encontrado.",
    };
  }

  return {
    title: post.title,
    description: post.excerpt ?? "Leia este artigo no blog da ClinPé.",
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await sanityClient.fetch<BlogPost | null>(postQuery, { slug });

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 md:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        {post.mainImageUrl ? (
          <img
            src={post.mainImageUrl}
            alt={post.title}
            className="mb-8 h-64 w-full rounded-xl object-cover md:h-80"
          />
        ) : null}

        <header className="mb-8 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-base text-slate-600 md:text-lg">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        <section className="space-y-4 text-slate-700">
          <PortableText value={post.body ?? []} />
        </section>
      </article>
    </main>
  );
}
