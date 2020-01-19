

#' Earlier Date
#'
#' Returns the earlier of two dates
#'
#' Applies element-wise to vectors of dates
#'
#' @param dt1 a vector of dates
#' @param dt2 a vector of dates
#'
#' @examples
#'
#' @family Date Functions
#' @export
earlierDate <- function(dt1, dt2) {
  vals <- ifelse(dt1 < dt2, dt1, dt2)
  class(vals) <- "Date"
  return(vals)
}

#' later Date
#'
#' Returns the later of two dates
#'
#' Applies element-wise to vectors of dates
#'
#' @param dt1 a vector of dates
#' @param dt2 a vector of dates
#'
#' @examples
#'
#' @family Date Functions
#' @export
laterDate <- function(dt1, dt2) {
  vals <- ifelse(dt1 < dt2, dt2, dt1)
  class(vals) <- "Date"
  return(vals)
}

#' Is Between Dates
#'
#' Returns true if date X is between dates 1 and 2.
#'
#' Applies element-wise to vectors of dates
#'
#' @param dtx a vector of dates
#' @param dt1 a vector of dates
#' @param dt2 a vector of dates
#'
#' @examples
#'
#' @family Date Functions
#' @export
isBetweenDates <- function(dtx, dt1, dt2) {
  ifelse(dt1 <= dtx & dtx < dt2, TRUE, FALSE)
}


#' Create Dummy Data
#'
#' Returns a randomly generated experience table for 100 policies,
#' for 2016-2019.  By default the rows will be ordered byy policy start date
#'
#'
#' @examples
#' ed1 <- createDummyData()
#'
#' @export
createDummyData <- function() {

  # create some dummy policies
  PolicyData <- data.frame(
    pol_no = paste0("ABC", 1001:1100),
    product = c(rep("Individual", 40), rep("Group",60))
  )
  PolicyData$BirthDate = ymd("1940-1-1") %m+% months( round(runif(100)*500) )
  PolicyData$EntryDate = ymd("2010-1-1") %m+% months( round(runif(100)*100) )
  PolicyData$ExitDate = ymd("2010-1-1") %m+% months( round(runif(100)*300) )

  # set the exposure dates
  exposureStartDate <- ymd("2016-1-1")
  exposureEndDate <- ymd("2019-12-31")
  yr <- 2016

  # figure out how to split up each year
  pd2 <- PolicyData %>%
    mutate(startYear   = make_date(yr, month(exposureStartDate), day(exposureStartDate))) %>%
    mutate(birthday    = make_date(yr, month(BirthDate), day(BirthDate))) %>%
    mutate(anniversary = make_date(yr, month(EntryDate), day(EntryDate))) %>%
    mutate(endYear     = make_date(yr+1, month(exposureStartDate), day(exposureStartDate))) %>%
    mutate(birthdayBeforeAnniversary = ifelse(birthday < anniversary, TRUE, FALSE)) %>%
    mutate(event1 = earlierDate(birthday, anniversary)) %>%
    mutate(event2 = laterDate(birthday, anniversary)) %>%
    mutate(daysInYear = (startYear %--% endYear) %/% days(1)) %>%
    mutate(p1         = (startYear %--% event1)  %/% days(1) / daysInYear) %>%
    mutate(p2         = (event1 %--% event2)     %/% days(1) / daysInYear) %>%
    mutate(p3         = (event2 %--% endYear)    %/% days(1) / daysInYear) %>%
    select(pol_no,
           BirthDate, EntryDate, ExitDate,
           event0 = startYear, event1, event2, event3 = endYear,
           p1, p2, p3, birthdayBeforeAnniversary)

  # set the age and duration for the first year
  pd3 <- pd2 %>%
    mutate(Age.y = (BirthDate %--% exposureStartDate) %/% years(1)) %>%
    mutate(Dur.y = (EntryDate %--% exposureStartDate) %/% years(1) + 1)

  # collate a list of 12 exposure tables (4 years * 3 periods in each year)
  ep1 <- list()
  for (y in 0:3) {
    ep1[[y*3+1]] <- pd3 %>%
      mutate(start = event0 + years(y)) %>%
      mutate(end   = event1 + years(y)) %>%
      mutate(Age.y = Age.y + y) %>%
      mutate(Dur.y = Dur.y + y) %>%
      mutate(year = yr + y)%>%
      select(pol_no, Age.y, Dur.y, year, Exposure.y = p1, start, end, BirthDate, EntryDate, ExitDate)
    ep1[[y*3+2]] <- pd3 %>%
      mutate(start = event1 + years(y)) %>%
      mutate(end   = event2 + years(y)) %>%
      mutate(Age.y = ifelse(birthdayBeforeAnniversary, Age.y + y + 1, Age.y + y    )) %>%
      mutate(Dur.y = ifelse(birthdayBeforeAnniversary, Dur.y + y,     Dur.y + y + 1)) %>%
      mutate(year = yr + y) %>%
      select(pol_no, Age.y, Dur.y, year, Exposure.y = p2, start, end, BirthDate, EntryDate, ExitDate)
    ep1[[y*3+3]] <- pd3 %>%
      mutate(start = event2 + years(y)) %>%
      mutate(end   = event3 + years(y)) %>%
      mutate(Age.y =  Age.y + y + 1) %>%
      mutate(Dur.y =  Dur.y + y + 1) %>%
      mutate(year = yr + y) %>%
      select(pol_no, Age.y, Dur.y, year, Exposure.y = p3, start, end, BirthDate, EntryDate, ExitDate)
  }

  # bind the 12 tables into one table
  et1 <- do.call("rbind", ep1) %>% arrange(pol_no)

  # limit the exposure if the policy left in or before the period, or if the policy started after...
  et1 <- et1 %>%
    mutate(exitInPeriod = isBetweenDates(ExitDate, start, end)) %>%
    mutate(Exposure.y = ifelse(exitInPeriod,
                               (start %--% ExitDate) %/% days(1) / 365.25,
                               Exposure.y)) %>%
    mutate(exitBeforePeriod = ifelse(ExitDate < start, TRUE, FALSE)) %>%
    mutate(Exposure.y = ifelse(exitBeforePeriod,
                               0,
                               Exposure.y)) %>%
    filter(Exposure.y > 0) %>%
    filter(Dur.y > 0)

  # select and relabel
  et1 <- et1 %>% arrange(EntryDate) %>%
                 select(pol_no,
                        age = Age.y,
                        dur = Dur.y,
                        year,
                        start,
                        end,
                        exposure = Exposure.y,
                        decrements = exitInPeriod) %>%
                  mutate(decrements = as.integer(decrements))

  return(et1)

}
