import Link from "next/link";
import { groq } from "next-sanity";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sanityClient } from "@/lib/sanity/client";

type PostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
};

const postsQuery = groq`
  *[_type == "post"] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    "imageUrl": mainImage.asset->url
  }
`;

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await sanityClient.fetch<PostCard[]>(postsQuery);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Blog
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Artigos e conteudos mais recentes
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 md:text-base">
            Novidades, guias praticos e materiais para apoiar sua rotina
            clinica.
          </p>
        </header>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-sm text-slate-600">
                Nenhum artigo publicado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post._id} className="overflow-hidden">
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-slate-200 to-slate-100" />
                )}

                <CardHeader className="space-y-2">
                  <CardTitle className="text-xl leading-tight">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="transition-colors hover:text-primary"
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {post.excerpt ?? "Sem resumo disponivel."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
