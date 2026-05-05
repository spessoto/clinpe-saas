import Image from "next/image";
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

function isSanityConfigError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}

async function getPostsSafely() {
  try {
    return await sanityClient.fetch<PostCard[]>(postsQuery);
  } catch (error) {
    if (isSanityConfigError(error)) {
      console.warn("Sanity dataset/project not found for /blog during build.");
      return [];
    }

    throw error;
  }
}

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPostsSafely();

  return (
    <main className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/logo-pododesk.png"
              alt="PodoDesk"
              width={170}
              height={57}
              className="h-auto w-36 md:w-40"
              priority
            />
          </Link>

          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-600 transition hover:text-primary"
            >
              Início
            </Link>
            <Link
              href="/blog"
              className="text-sm font-semibold text-primary transition hover:text-primary"
            >
              Blog
            </Link>
            <Link href="/sign-in" className="btn-gradient px-4 py-2 text-sm">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto mt-24 max-w-6xl space-y-8 px-6 py-10 md:mt-28 md:px-8 md:py-12">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Blog
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Artigos e conteúdos mais recentes
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 md:text-base">
            Novidades, guias práticos e materiais para apoiar sua rotina
            clínica.
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
                    {post.excerpt ?? "Sem resumo disponível."}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
        )}
      </section>

      <footer className="bg-slate-900 px-6 pb-12 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center space-y-10 text-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Pronto para elevar o padrão da sua clínica?
              </h2>
              <Link
                href="/sign-up"
                className="btn-gradient inline-flex rounded-full px-10 py-5 text-xl font-black"
              >
                Quero testar o PodoDesk por 14 dias
              </Link>
            </div>

            <div className="grid w-full grid-cols-1 gap-10 border-t border-slate-800 pt-12 text-left md:grid-cols-4">
              <div className="space-y-4 md:col-span-1">
                <Image
                  src="/logo-pododesk-white.png"
                  alt="PodoDesk"
                  width={180}
                  height={60}
                  className="h-auto w-40"
                />
                <p className="text-sm leading-relaxed text-slate-400">
                  Gestão clínica com precisão asséptica. Desenvolvido por
                  especialistas para profissionais de alto rendimento.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Produto</h4>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="/#funcionalidades"
                >
                  Funcionalidades
                </a>
                <a
                  className="block text-slate-400 transition hover:text-white"
                  href="/#precos"
                >
                  Preços
                </a>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/blog"
                >
                  Blog
                </Link>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Suporte</h4>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/helpdesk"
                >
                  Central de Ajuda
                </Link>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/contato"
                >
                  Contato
                </Link>
              </div>

              <div className="space-y-3">
                <h4 className="mb-4 font-bold text-white">Legal</h4>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/termos-de-uso"
                >
                  Termos de Uso
                </Link>
                <Link
                  className="block text-slate-400 transition hover:text-white"
                  href="/politica-de-privacidade"
                >
                  Privacidade
                </Link>
              </div>
            </div>

            <div className="flex w-full flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row">
              <span>
                © 2024 PodoDesk. Gestão clínica com precisão asséptica.
              </span>
              <div className="flex gap-6">
                <a className="transition hover:text-white" href="#">
                  LinkedIn
                </a>
                <a className="transition hover:text-white" href="#">
                  Instagram
                </a>
                <a className="transition hover:text-white" href="#">
                  YouTube
                </a>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              CNPJ 26.730.764/0001-26 | Nº 366 | CEP 12.908-540.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
