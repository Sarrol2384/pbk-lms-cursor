import { availabilityFromQuery, type ApplicationAvailability } from '@/content/application-availability'
import { createAnonClient } from '@/lib/supabase/server'

const CLOSED: ApplicationAvailability = { openings: [], databaseEnforced: false }

/**
 * Read the openings table with the anonymous key, the same access a direct
 * Supabase call has. A missing table or failed read stays closed.
 * Published courses are not consulted.
 */
export async function loadApplicationAvailability(): Promise<ApplicationAvailability> {
  try {
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .from('prospectus_application_openings')
      .select('programme_id, level')
    return availabilityFromQuery(error, data)
  } catch {
    return CLOSED
  }
}
