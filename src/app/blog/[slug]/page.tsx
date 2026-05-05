import React from "react";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
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

function isSanityConfigError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}

async function getPostMetadataSafely(slug: string) {
  try {
    return await sanityClient.fetch<Pick<BlogPost, "title" | "excerpt"> | null>(
      postMetadataQuery,
      { slug },
    );
  } catch (error) {
    if (isSanityConfigError(error)) {
      console.warn("Sanity dataset/project not found for blog metadata.");
      return null;
    }

    throw error;
  }
}

async function getPostSafely(slug: string) {
  try {
    return await sanityClient.fetch<BlogPost | null>(postQuery, { slug });
  } catch (error) {
    if (isSanityConfigError(error)) {
      console.warn("Sanity dataset/project not found for blog post page.");
      return null;
    }

    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const post = await getPostMetadataSafely(slug);

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

const blogPortableTextComponents = {
  block: {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="mb-4 mt-8 text-3xl font-bold leading-tight text-slate-900">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="mb-3 mt-7 text-2xl font-bold leading-snug text-slate-900">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mb-2 mt-6 text-xl font-bold leading-snug text-slate-800">
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="mb-2 mt-5 text-lg font-bold leading-snug text-slate-800">
        {children}
      </h4>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
  },
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await getPostSafely(slug);

  if (!post) {
    notFound();
  }

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

      <section className="mx-auto mt-24 max-w-3xl px-6 py-10 md:mt-28 md:px-8 md:py-12">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
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
            <PortableText
              value={post.body ?? []}
              components={blogPortableTextComponents}
            />
          </section>
        </article>
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
