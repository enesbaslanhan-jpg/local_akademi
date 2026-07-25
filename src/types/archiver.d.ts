declare module 'archiver' {
  interface Archiver {
    pipe(destination: any): this
    file(path: string, data?: any): this
    append(content: any, data?: any): this
    finalize(): void
    on(event: string, callback: (err: Error | null, archive: any) => void): this
  }

  interface ArchiverOptions {
    zlib?: { level?: number }
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver

  export = archiver
}