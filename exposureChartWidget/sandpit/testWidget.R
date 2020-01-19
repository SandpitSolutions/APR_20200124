# dummy data
DD <- data.frame(
  pol_no = c("A1", "A1", "A1", "A2", "A2", "A3"),
  age = c(24,25,26,25,26,28),
  dur = c(1,2,3, 1, 2, 1),
  year = c(2016,2017,2018, 2016, 2017, 2018),
  start = lubridate::ymd(c("2016-1-1", "2017-1-1", "2018-1-1", "2016-3-3", "2017-1-1", "2018-2-6")),
  end = lubridate::ymd(c("2017-1-1", "2018-1-1", "2018-2-24", "2017-1-1", "2017-7-7", "2019-1-1")),
  decrements = c(0,0,1,0,1,0)
)
DD$exposure = pmin(as.double(difftime(DD$end, DD$start, units = "days")/365),1)

exposureChartWidget(DD, showVariables = c("age", "dur"))
exposureChartWidget(DD, showVariables = c("age", "dur", "year"))
exposureChartWidget(DD, showVariables = c("age", "dur", "year", "pol_no"))



# what does this look like in JS?
glimpse(DD)
sum(DD$exposure)




