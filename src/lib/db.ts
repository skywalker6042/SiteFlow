import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  types: {
    // Return `date` columns as plain YYYY-MM-DD strings instead of Date objects.
    // Without this, postgres.js converts date → Date, which breaks HTML date inputs
    // (they expect "YYYY-MM-DD") and calendar date comparisons.
    date: {
      to: 1082,
      from: [1082],
      serialize: (x: string) => x,
      parse: (x: string) => x,
    },
  },
})

export default sql
