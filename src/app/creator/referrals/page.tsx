import { redirect } from 'next/navigation';

/**
 * Legacy referral page.
 *
 * The referral bonus program ($10/$25/$50) was retired in favor of the
 * Squad revenue-share model. Any bookmarks or external links land here
 * and are sent to the new Squad page.
 */
export default function CreatorReferralsRedirectPage(): never {
  redirect('/creator/squad');
}
