% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/exposureChartWidget.R
\name{exposureChartWidget}
\alias{exposureChartWidget}
\title{Exposure Chart interactive plot}
\usage{
exposureChartWidget(data = NULL, showVariables = c("age", "dur", "year",
  "pol_no"), options = NULL, width = NULL, height = NULL,
  elementId = NULL)
}
\arguments{
\item{data}{Data should be...}

\item{width}{Width in pixels (optional, defaults to automatic sizing)}

\item{height}{Height in pixels (optional, defaults to automatic sizing)}

\item{elementId}{Use an explicit element ID for the widget (rather than an
automatically generated one). Useful if you have other JavaScript that
needs to explicitly discover and interact with a specific widget instance.}
}
\value{
Interactive line chart widget
}
\description{
This widget shows 'exposure to risk' plotted against age (\code{age}), duration (\code{dur}) and
exposure year (\code{year}).
}
\details{
The exposure can be displayed in one of three ways:
* time means the data is reresented by rectangles with time in the x axis and pol_no in the y-xis
* duration means the data is represented by circles where duration is in the x-axis, age is in the y-axis
 and the radius is the total exposure / number of decrements or decrement rate
* duration / year...

The valid options are:
}
\examples{
library(exposureChartWidget)
exposureChartWidget()


}
