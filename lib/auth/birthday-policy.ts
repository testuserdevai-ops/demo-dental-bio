const ADULT_AGE_YEARS = 18;
const BIRTHDAY_RANGE_YEARS = 100;

function subtractCalendarYearsClamped(date: Date, years: number) {
  const targetYear = date.getFullYear() - years;
  const month = date.getMonth();
  const lastDayOfTargetMonth = new Date(targetYear, month + 1, 0).getDate();

  return new Date(
    targetYear,
    month,
    Math.min(date.getDate(), lastDayOfTargetMonth),
  );
}

export function getBirthdayBounds(referenceDate = new Date()) {
  const adultCutoff = subtractCalendarYearsClamped(
    referenceDate,
    ADULT_AGE_YEARS,
  );

  return {
    adultCutoff,
    earliestBirthday: subtractCalendarYearsClamped(
      adultCutoff,
      BIRTHDAY_RANGE_YEARS,
    ),
  };
}
