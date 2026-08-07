"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui";

/**
 * Who can do what, for the owner.
 *
 * Every guard here is cosmetic — hiding a button the caller cannot use is a
 * courtesy, not a defence. set_role() in the database refuses a non-owner, a
 * self-demotion and any attempt to touch another owner, so this panel can be
 * read-only for an admin without weakening anything.
 */

type Person = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "owner";
  createdAt: number;
};

export function PeopleManager() {
  const { account } = useApp();
  const [people, setPeople] = useState<Person[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  // The role change the owner has asked for but not yet confirmed.
  const [pending, setPending] = useState<{ person: Person; role: "admin" | "student" } | null>(
    null,
  );

  // No synchronous setState here: `loading` starts true, so the effect can call
  // this without triggering a cascading render before the first paint.
  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/people");
      if (!response.ok) {
        setError("Could not load people.");
        return;
      }
      const body = (await response.json()) as { people: Person[]; isOwner: boolean };
      setPeople(body.people);
      setIsOwner(body.isOwner);
      setError(null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetching a roster on mount is the ordinary "subscribe to an external
  // system" case the rule exists to police, but it cannot see that the setState
  // calls happen after an await. Same scoped exception as the store's hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function setRole(person: Person, role: "admin" | "student") {
    setBusyId(person.id);
    setError(null);
    setPending(null);
    const response = await apiFetch("/api/people", {
      method: "POST",
      body: JSON.stringify({ id: person.id, role }),
    });
    setBusyId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "That did not work.");
      return;
    }
    // Reflect immediately; the list is small and a refetch would flicker.
    setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, role } : p)));
  }

  const term = filter.trim().toLowerCase();
  const shown = term
    ? people.filter(
        (p) =>
          p.email.toLowerCase().includes(term) || p.name.toLowerCase().includes(term),
      )
    : people;

  const admins = people.filter((p) => p.role !== "student").length;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-[22px]">People</h2>
        <p className="text-[13px] text-muted">
          {people.length} signed up · {admins} with content access
        </p>
      </div>

      {!isOwner && (
        <p className="notice mt-4">
          Only the owner can change roles. You are seeing this list read-only.
        </p>
      )}

      {error && (
        <p className="notice notice-error mt-4" role="alert">
          {error}
        </p>
      )}

      <input
        className="field mt-5"
        placeholder="Search by name or email"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading ? (
        <p className="text-muted mt-6 text-[14px]">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted mt-6 text-[14px]">Nobody matches that.</p>
      ) : (
        <ul className="mt-5 border-t">
          {shown.map((person) => {
            const isSelf = person.id === account?.id;
            const isOwnerRow = person.role === "owner";
            // The database refuses both of these; the UI just does not offer them.
            const locked = isSelf || isOwnerRow || !isOwner;

            return (
              <li
                key={person.id}
                className="flex flex-wrap items-center gap-3 py-3.5 border-b"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">
                    {person.name || "—"}
                    {isSelf && <span className="text-faint font-normal"> (you)</span>}
                  </p>
                  <p className="text-[13px] text-muted truncate">{person.email}</p>
                </div>

                <span
                  className="chip shrink-0"
                  style={{
                    ["--tone" as string]:
                      person.role === "owner"
                        ? "var(--s-rose)"
                        : person.role === "admin"
                          ? "var(--s-violet)"
                          : "var(--line-strong)",
                  }}
                >
                  {person.role}
                </span>

                {!locked && (
                  <button
                    type="button"
                    className="btn btn-sm shrink-0"
                    disabled={busyId === person.id}
                    onClick={() =>
                      setPending({
                        person,
                        role: person.role === "admin" ? "student" : "admin",
                      })
                    }
                  >
                    {busyId === person.id
                      ? "…"
                      : person.role === "admin"
                        ? "Remove admin"
                        : "Make admin"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 text-[13px] leading-relaxed text-faint">
        An admin can write and delete questions in the shared bank that every student
        practises from. Removing someone&apos;s admin role leaves their questions in place.
        Owners are set in the Supabase SQL editor only, so nobody can appoint themselves.
      </p>

      {pending && (
        <ConfirmDialog
          title={pending.role === "admin" ? "Make this person an admin?" : "Remove admin access?"}
          body={
            <>
              <span className="font-medium text-foreground">
                {pending.person.name || pending.person.email}
              </span>{" "}
              ({pending.person.email}){" "}
              {pending.role === "admin"
                ? "will be able to write and delete questions in the shared bank every student practises from."
                : "will go back to being a student and lose access to the question editor. Questions they already wrote stay in the bank."}
            </>
          }
          confirmLabel={pending.role === "admin" ? "Make admin" : "Remove admin"}
          danger={pending.role === "student"}
          busy={busyId === pending.person.id}
          onConfirm={() => void setRole(pending.person, pending.role)}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
