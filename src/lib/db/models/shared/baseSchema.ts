import type { SchemaOptions } from 'mongoose'

export const buildSchemaOptions = (collection: string): SchemaOptions => ({
  collection,
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      const r = ret as Record<string, unknown>
      r['id'] = (r['_id'] as { toString(): string }).toString()
      delete r['_id']
      return r
    },
  },
  toObject: { virtuals: true },
})
