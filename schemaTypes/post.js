import {defineField, defineType} from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fieldsets: [
    {
      name: 'seoMeta',
      title: 'SEO & Meta',
      options: {collapsible: true, collapsed: false},
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Descreva a imagem para acessibilidade e SEO.',
          validation: (Rule) => Rule.required().min(10),
        }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      description: 'Titulo SEO recomendado com ate 60 caracteres.',
      fieldset: 'seoMeta',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      description: 'Descricao SEO recomendada com ate 160 caracteres.',
      fieldset: 'seoMeta',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'keywords',
      title: 'Keywords',
      type: 'array',
      of: [{type: 'string'}],
      fieldset: 'seoMeta',
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: 'SEO summary shown on the page. Max 160 characters.',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {type: 'block'},
        {
          name: 'bodyImage',
          title: 'Body image',
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Texto alternativo da imagem para acessibilidade e SEO.',
              validation: (Rule) => Rule.required().min(10),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Legenda exibida junto da imagem no corpo do artigo.',
            }),
          ],
        },
        {
          name: 'ctaBox',
          title: 'CTA Box',
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'subtitle',
              title: 'Subtitle',
              type: 'string',
            }),
            defineField({
              name: 'buttonText',
              title: 'Button text',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
    }),
  ],
})
