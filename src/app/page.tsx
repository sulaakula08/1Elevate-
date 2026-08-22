"use client";

import { useApp } from "@/lib/app-state";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/Dashboard";
import { BootScreen } from "@/components/BootScreen";

export default function HomePage() {
  const { account, ready, authBusy } = useApp();

  /*
   * An identity in flight beats both branches below. Signing in used to fall
   * through to the landing — `ready` was true from the initial boot and
   * `account` was still null while the profile loaded, which is indistinguishable
   * from a visitor — and signing out reached it in the same frame as the click.
   */
  if (authBusy) return <BootScreen standalone label="One moment…" />;

  if (ready && account) return <Dashboard account={account} />;

  /*
   * Both are rendered while the answer is unknown, and CSS picks between them
   * before the first paint — see BootScreen and the boot script in layout.tsx.
   *
   * A React branch cannot do this. Whether a session exists is in localStorage,
   * which the server cannot read, so the server always sends the landing; a
   * client that decided differently on its first render would hydrate
   * mismatched, and one that decided in an effect would show the landing for a
   * frame first. Either way a signed-in student meets the marketing page on the
   * way to their dashboard, which is the bug.
   *
   * `ready` is what ends it: once the profile has arrived this component either
   * renders the dashboard above, or falls through with the landing visible
   * because the provider has cleared the attribute.
   */
  return (
    <>
      <BootScreen />
      <div className="boot-landing">
        <Landing />
      </div>
    </>
  );
}
