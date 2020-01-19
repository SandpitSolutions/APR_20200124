#
# This is a Shiny web application. You can run the application by clicking
# the 'Run App' button above.
#
# Find out more about building applications with Shiny here:
#
#    http://shiny.rstudio.com/
#

library(shiny)
library(exposureChartWidget)

# Define UI for application that draws a histogram
ui <- fluidPage(

    # Application title
    titlePanel("Exposure Chart"),

    # Sidebar with a slider input for number of bins 
    sidebarLayout(
        sidebarPanel(
            sliderInput("dataRows",
                        "Experience Data Rows",
                        min = 1,
                        max = 700,
                        value = 20)
            ,
            sliderInput("transitionDuration",
                        "Transition Duration",
                        min = 200,
                        max = 5000,
                        value = 1000),
            sliderInput("ageColourMax",
                        "Age",
                        min = 64,
                        max = 255,
                        value = 32), 
            sliderInput("durColourMax",
                        "Duration",
                        min = 64,
                        max = 255,
                        value = 32), 
            sliderInput("yearColourMax",
                        "Year",
                        min = 64,
                        max = 255,
                        value = 32), 
            radioButtons("chartType", "Chart Type", choices = c("2D", "3D", "policies"), selected = "policies",
                         inline = FALSE, width = NULL, choiceNames = NULL,
                         choiceValues = NULL),
            radioButtons("zVariable", "Z Variable", choices = c("exposure", "decrements", "decrate"), selected = "exposure",
                         inline = FALSE, width = NULL, choiceNames = NULL,
                         choiceValues = NULL)
        ),

        # Show a plot of the generated distribution
        mainPanel(
           exposureChartWidgetOutput("exposureChart")
        )
    )
)

# Define server logic required to draw a histogram
server <- function(input, output) {

    DD <- createDummyData()
    
    # create the widgets
    output$exposureChart <- renderExposureChartWidget({
        
        # how much data do we want to use?
        showData <- DD[1:input$dataRows,]
        
        # set options
        options <- list()
        options$ageColourMin  <- '#404040'
        options$durColourMin  <- '#404040'
        options$yearColourMin <- '#404040'
        options$ageColourMax  <- paste0("#",  as.hexmode(input$ageColourMax), "40", "40")
        options$durColourMax  <- paste0("#", "40", as.hexmode(input$durColourMax),  "40")
        options$yearColourMax <- paste0("#", "40", "40",as.hexmode(input$yearColourMax))
        options$zVariable     <- input$zVariable
        options$transitionDuration <- input$transitionDuration
        
        # create and return widget
        if (input$chartType == "2D") {
            print("refresh 2D: ")
            return(exposureChartWidget(showData, showVariables = c("age", "dur"), options = options))
        } else if (input$chartType == "3D") {
            print("refresh 3D")
            return(exposureChartWidget(showData, showVariables = c("age", "dur", "year"), options = options))
        } else {
            print("refresh policy view")
            return(exposureChartWidget(showData, showVariables = c("age", "dur", "year", "pol_no"), options = options))
        }
        
       
    })
}

# Run the application 
shinyApp(ui = ui, server = server)
