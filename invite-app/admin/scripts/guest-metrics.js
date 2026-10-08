export function calculateGuestMetrics(guests) {
  const confirmed = guests.filter((guest) => guest.attendance === true);
  const declined = guests.filter((guest) => guest.attendance === false);
  const companionCount = guests.reduce(
    (total, guest) => total + guest.companions,
    0,
  );
  const confirmedCompanions = confirmed.reduce(
    (total, guest) => total + guest.companions,
    0,
  );

  return {
    totalGuests: guests.length,
    confirmedGuests: confirmed.length,
    declinedGuests: declined.length,
    totalCompanions: companionCount,
    confirmedPeople: confirmed.length + confirmedCompanions,
  };
}
