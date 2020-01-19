
#' Exposure Chart interactive plot
#'
#' This widget shows 'exposure to risk' plotted against age (\code{age}), duration (\code{dur}) and
#' exposure year (\code{year}).
#'
#' The exposure can be displayed in one of three ways:
#' * time means the data is reresented by rectangles with time in the x axis and pol_no in the y-xis
#' * duration means the data is represented by circles where duration is in the x-axis, age is in the y-axis
#'  and the radius is the total exposure / number of decrements or decrement rate
#' * duration / year...
#'
#' The valid options are:
#'
#'
#' @inheritParams htmlwidgets::createWidget
#'
#' @param data Data should be...
#'
#' @param width Width in pixels (optional, defaults to automatic sizing)
#' @param height Height in pixels (optional, defaults to automatic sizing)
#'
#' @return Interactive line chart widget
#'
#'
#' @examples
#' library(exposureChartWidget)
#' exposureChartWidget()
#'
#'
#' @export
exposureChartWidget <- function(data = NULL,
                                showVariables = c("age", "dur", "year", "pol_no"),
                                options = NULL,
                                width = NULL,
                                height = NULL,
                                elementId = NULL) {


  # create x ( attrs + some data) as the payload to send to the widget
  x <- list()

  # ---------------------------_ what story?  -------------------------------





  # ---------------------------_ set the data -------------------------------

  # do we want to do any grouping?
  # add id (should be unique)
  data <- data %>%
    mutate(id = paste(age, dur, year, pol_no, sep = "-")) %>%
    mutate(decrate = decrements / exposure)

  if ("pol_no" %in% showVariables) {

    # no grouping - show rectangles

  }  else if ("year" %in% showVariables) {

    # group the policies and append
    totals <- data %>%
      group_by(age, dur, year) %>%
      summarise(exposure = sum(exposure),
                decrements = sum(decrements)) %>%
      ungroup() %>%
      mutate(decrate = decrements / exposure) %>%
      mutate(pol_no = "total") %>%
      mutate(id = paste(age, dur, year, pol_no, sep = "-"))
    data <- rbind(data %>% select(id, age, dur, year, pol_no, exposure, decrements, decrate), totals)

  } else {

    # group by age and duration
    # group the policies and append
    totals <- data %>%
      group_by(age, dur) %>%
      summarise(exposure = sum(exposure),
                decrements = sum(decrements)) %>%
      ungroup() %>%
      mutate(decrate = decrements / exposure) %>%
      mutate(pol_no = "total") %>%
      mutate(year = "total") %>%
      mutate(id = paste(age, dur, year, pol_no, sep = "-"))
    data <- rbind(data %>% select(id, age, dur, year, pol_no, exposure, decrements, decrate), totals)

  }

  # attach data to the payload
  x$data <- data

  # ---------------------------_ set the options -------------------------------

  # add data (strip names first so we marshall as a 2d array)
  #names(data) <- NULL
  minColour <-"#222222"

  if (is.null(options))                options <- list()

  #if (is.null(options$chartAxisTitleX)) options$chartAxisTitleX <- "NULL"
  #if (is.null(options$chartAxisTitleY)) options$chartAxisTitleY <- "NULL"
  #if (is.null(options$chartTitle))      options$chartTitle      <- "NULL"

  if (is.null(options$ageColourMin))   options$ageColourMin  <- minColour
  if (is.null(options$durColourMin))   options$durColourMin  <- minColour
  if (is.null(options$yearColourMin))  options$yearColourMin <- minColour

  if (is.null(options$ageColourMax))   options$ageColourMax  <- "#DD2222"
  if (is.null(options$durColourMax))   options$durColourMax  <- "#22DD22"
  if (is.null(options$yearColourMax))  options$yearColourMax <- "#2222DD"

  if (is.null(options$zVariable))      options$zVariable     <- "exposure"

  # figure out which viewState we want:
  if ("pol_no" %in% showVariables) {
    options$chartType <- "policies"
  } else if ("year" %in% showVariables) {
    options$chartType <- "3D"
  } else {
    options$chartType <- "2D"
  }

  # attach options to the payload
  x$options <- options


  print(x$options)

  # ---------------------------_ create the widget -------------------------------

  htmlwidgets::createWidget(
    name = "exposureChartWidget",
    x = x,
    width = width,
    height = height,
    package = "exposureChartWidget",
    #dependencies = r2d3::html_dependencies_d3(version = "4"),
    sizingPolicy = htmlwidgets::sizingPolicy(
      #viewer.padding = 10,
      #viewer.paneHeight = 500,
      viewer.fill = TRUE,
      browser.fill = TRUE
    ),
    elementId = elementId
  )

}

#' Shiny bindings for Widget
#'
#' Output and render functions for using this widget within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{"100\%"},
#'   \code{"400px"}, \code{"auto"}) or a number, which will be coerced to a
#'   string and have \code{"px"} appended.
#' @param expr An expression that generates a dygraph
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name lineChartWidget-shiny
#'
#' @export
exposureChartWidgetOutput <- function(outputId, width = "100%", height = "700px") {
  htmlwidgets::shinyWidgetOutput(outputId, "exposureChartWidget", width, height)
}

#' @rdname lineChartWidget-shiny
#' @export
renderExposureChartWidget <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, exposureChartWidgetOutput, env, quoted = TRUE)
}

