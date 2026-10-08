import { calculateGuestMetrics } from "./guest-metrics.js";

Deno.test("guest metrics calculate counts and confirmed people", () => {
  const metrics = calculateGuestMetrics([
    { attendance: true, companions: 2 },
    { attendance: true, companions: 2 },
    { attendance: true, companions: 0 },
    { attendance: false, companions: 0 },
  ]);

  if (
    metrics.totalGuests !== 4 ||
    metrics.confirmedGuests !== 3 ||
    metrics.declinedGuests !== 1 ||
    metrics.totalCompanions !== 4 ||
    metrics.confirmedPeople !== 7
  ) {
    throw new Error(`Unexpected metrics: ${JSON.stringify(metrics)}`);
  }
});

Deno.test("empty guest list produces zero metrics", () => {
  const metrics = calculateGuestMetrics([]);

  if (Object.values(metrics).some((value) => value !== 0)) {
    throw new Error(
      `Empty list should have zero metrics: ${JSON.stringify(metrics)}`,
    );
  }
});

Deno.test("metrics reflect guest edits and deletions when recalculated", () => {
  const guests = [
    { attendance: true, companions: 2 },
    { attendance: false, companions: 0 },
  ];
  const before = calculateGuestMetrics(guests);
  guests[0] = { attendance: false, companions: 0 };
  const afterEdit = calculateGuestMetrics(guests);
  guests.splice(1, 1);
  const afterDelete = calculateGuestMetrics(guests);

  if (
    before.confirmedPeople !== 3 ||
    afterEdit.confirmedPeople !== 0 ||
    afterEdit.declinedGuests !== 2 ||
    afterDelete.totalGuests !== 1 ||
    afterDelete.declinedGuests !== 1
  ) {
    throw new Error("Metrics did not reflect guest updates.");
  }
});
