HTMLWidgets.widget({

  name: "exposureChartWidget",

  type: "output",

  factory: function(el, width, height) {


// ----------------------------------------------------------------------
//
//                      Create Elements / Variable
//
// ----------------------------------------------------------------------

  {
    // variables declared here will exist inside the object that is creted by the factory
    // they can be accessed by any of the functions defined inside the factory (like global variable)
    // but unlike global variables, they can only be accessed by the object

    // ----------------------------------------------------------------------
    //  Chart Objects
    // ----------------------------------------------------------------------

    // everything fits into the width and height of the widget, but we should specify the size
    // of each of the chart elements we are going to draw.
    // the user may not specify a margin, so we should set a default
    var defaultMargin = {top: 50, right: 5, bottom: 50, left: 60};  // margin between svg edge and the chart rectangle


    var chartWidth,
        chartHeight,
        chartMinY,
        chartMaxY;

    // set up the svg here so that it can be modified after creation
    // the SVG node is attached as a child of the element provided when creating the element.
    // the child elements of the SVG node (Whcih we will create) are therefore SVG elements rather
    // than HMTL DOM elements
    var svg = d3.select(el).append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("class", "pcChart");

    // We also create a tooltip element that we can fill later.
    // Note that this is attached to the element rather than the SVG becuase we want to use
    // HTML elements and CSS for this item (rather than SVG shapes).
    var tooltip = d3.select(el).append("div")
                        .style("opacity", 0)
                        .attr("class", "tooltip")
                        .attr("id", "widget_tooltip")
                        .attr("offset_x", 20)
                        .attr("offset_y", -40)
                        .style("position", "fixed")
                        .style("background-color", "white")
                        .style("border", "solid")
                        .style("border-width", "2px")
                        .style("border-radius", "5px")
                        .style("padding", "5px");

    // the chart area sits inside the svg
    var chartArea = svg.append("g");

    // various objects will be placed in the plot areas, and to keep them tidy, they will sit in groups;
    var dataShapeContainer = chartArea.append("g").attr("class", "data-shape-container");

    // we need to draw the axis
    var xAxis  = chartArea.append('g').attr('class', 'axisX');    // xAxis shown at the bottome of the chart
    var yAxis  = chartArea.append('g').attr('class', 'axisY');    // yAxis shown at the left

    // and add the titles
    var chartTitle      = svg.append("text");
    var chartAxisTitleX = chartArea.append("text");
    var chartAxisTitleY = chartArea.append("text");

    // ----------------------------------------------------------------------
    //  Create Scalers
    // ----------------------------------------------------------------------

    // we will also need to scale the values to the chartArea
    var yScale  = d3.scaleBand(),    // the Y-axis will always have a simple range
        bScale  = d3.scaleBand(),    // the x-axis it could be categories...
        tScale  = d3.scaleTime(),    // ...or we may use time in the x axis
        rScale  = d3.scalePow().exponent(0.5);   // the radius scale for the circles

    // we will use color to show data values, so we need ot scale those too

    var ageColorScale, //  = d3.scaleSequential().domain([1,10]).interpolator(d3.interpolatePuRd),
        durColorScale, //  = d3.scaleQuantize().domain([1, 20]).range(['#222222', '#22FF22']), //.interpolate(d3.interpolateRgb),
        yearColorScale, // = d3.scaleQuantize().domain([1, 20]).range(['#222222', '#2222FF']), //.interpolate(d3.interpolateRgb),
        nullColor ; //    = d3.rgb("#CCCCCC");   // grey color for deselected


    // ----------------------------------------------------------------------
    //  Data stuff
    // ----------------------------------------------------------------------

    // we create ordered, arrays to hold the valid values for duration, age,
    // year and policy number
    var durValues  = [],
        ageValues  = [],
        yearValues = [],
        polValues  = [],
        yearDurValues = [];

    // the data supplied by the caller will be reformatted and saves in this array
    var shapeData = [];

    // The data must be bound to the shapes.  That binding is saved in this object
    var dataBinding;

    var parseTime = d3.timeParse("%Y-%m-%d")

    // ----------------------------------------------------------------------
    //  View State
    // ----------------------------------------------------------------------

    // we will store all of the options in an array
    // these may have been supplied by the caller or they may be set using defaults
    var options = [];

    // the speed of any animations will default to 1000ms
    var transitionDuration = 1000;

  } // declarations


// ----------------------------------------------------------------------
//
//                     Unpack Options
//
// ----------------------------------------------------------------------

    function unpackOptions(userOptions) {

      // The general pattern is that the user can specify options in a long
      // flat list of options.  If the value for that option is null, then
      // some JS code will calculate the default value.
      console.log("user options" + JSON.stringify(userOptions));

      // make sure options is an array
      options = options || [];

      // start by copying over all the values provided by the user
      for (const [opt, val] of Object.entries(userOptions)) {
        options[opt] = val;
      }

      // check that the colours are a valid object
      options.ageColourMin  = options.ageColourMin  || nullColor;
      options.ageColourMax  = options.ageColourMax  || nullColor;
      options.durColourMin  = options.durColourMin  || nullColor;
      options.durColourMax  = options.durColourMax  || nullColor;
      options.yearColourMin = options.yearColourMin || nullColor;
      options.yearColourMax = options.yearColourMax || nullColor;

      // we must have a zVariable
      options.zVariable = options.zVariable || "exposure"

      // set the titles
      if (options.chartType == "policies") {
        defaultTitleX     = "Time"
        defaultTitleY     = ""
        defaultTitleChart = "Exposure Over Time"
      } else if (options.chartType == "3D") {
        defaultTitleX = "Duration and Exposure Year"
        defaultTitleY = "Age"
        defaultTitleChart =  capitalizeFirstLetter(options.zVariable) + " by Duration, Year and Age"
      } else {
        defaultTitleX = "Duration"
        defaultTitleY = "Age"
        defaultTitleChart =  capitalizeFirstLetter(options.zVariable) + " by Duration and Age"
      }
      options.chartAxisTitleX = userOptions.chartAxisTitleX  || defaultTitleX;
      options.chartAxisTitleY = userOptions.chartAxisTitleY  || defaultTitleY;
      options.chartTitle      = userOptions.chartTitle       || defaultTitleChart;

      // set the speed at which things update
      transitionDuration = options.transitionDuration || transitionDuration || 1000;

      // debug print
      console.log("options" + options);


    } // unpackOptions

// ----------------------------------------------------------------------
//
//                      Format Data
//
// ----------------------------------------------------------------------

    // formatting Data to a more d3-friendly format
    // extracting binNames and clusterNames
    function formatData(data){

      // convert data to JSON
      shapeData  = HTMLWidgets.dataframeToD3(data);

      // create arrays with the value ranges
      // define arrays
      ageValues      = [];
      durValues      = [];
      yearValues     = [];
      polValues      = [];
      yearDurValues  = [];
      // collate all values
      for(var i = 0; i < shapeData.length; i++){
        shapeData[i]['year_dur'] = shapeData[i]['year'] + "_" +
                                   shapeData[i]['dur'];
        ageValues.push(shapeData[i]['age']);
        durValues.push(shapeData[i]['dur']);
        yearValues.push(shapeData[i]['year']);
        polValues.push(shapeData[i]['pol_no']);
        yearDurValues.push(shapeData[i]['year_dur']);
      }
      // get unique values and sort
      ageValues     = [...new Set(ageValues)].sort(function(a,b){return a-b})
      durValues     = [...new Set(durValues)].sort(function(a,b){return a-b})
      yearValues    = [...new Set(yearValues)].sort(function(a,b){return a-b})
      polValues     = [...new Set(polValues)].sort()
      yearDurValues = [...new Set(yearDurValues)].sort()

      // Print some things to the console for debugging
      console.log("shapeData: " + JSON.stringify(shapeData));
      console.log("ages: "      + JSON.stringify(ageValues));
      console.log("durations: " + JSON.stringify(durValues));
      console.log("years: "     + JSON.stringify(yearValues));
      console.log("policies: "  + JSON.stringify(polValues));
      console.log("year_dur: "  + JSON.stringify(yearDurValues));


    } // formatData


// ----------------------------------------------------------------------
//
//                       Set up Chart
//
// ----------------------------------------------------------------------

    function setLayout(width, height) {

      // this function sets out the logical positions of the main DOM/SVG elements.
      // it does not set the position of the data linked objects.
      console.log("setLayout");

      // set the overall dimensions of the SVG area
      svg.attr("width", width).attr("height", height);

      // the chart area will sit inside the SVG frame with the set margins:
      var margin = {};
      margin.top     = options.marginTop     || defaultMargin.top
      margin.right   = options.marginRight   || defaultMargin.right
      margin.bottom  = options.marginBottom  || defaultMargin.bottom
      margin.left    = options.marginLeft    || defaultMargin.left

      // we also need to set some info about the text boxes for titles
      var textHeight = 19;  // the height for the text box
      var textMargin = 5;  // the margin around the text box

      // calculate the size of the two main plot areas
      chartWidth  = width  - margin.left - margin.right;
      chartHeight = height - margin.top  - margin.bottom;

      // set a transforms for the plot area
      chartArea.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // set a transform attribute so that we can position the tooltip
      tooltip.attr("chart_offset_x", 50 + margin.left)
              .attr("chart_offset_y", -5 + margin.top);

      // add the titles
      // attached to SVG (note the text anchor refers to the bottom of the text box)
      chartTitle.style("text-anchor", "middle")
                .attr("transform", "translate(" + ((width+margin.left-margin.right)/2) + "," + (textHeight+textMargin) + ")")
                .text(options.chartTitle || "");

      // attached to chartArea
      chartAxisTitleX.style("text-anchor", "middle")
                   .attr("transform", "translate(" + (chartWidth/2) + "," + (chartHeight+2*textMargin+2*textHeight) + ")")
                    .text(options.chartAxisTitleX);
      chartAxisTitleY.style("text-anchor", "middle")
                    .attr("transform", "translate(" + (-margin.left+textMargin+textHeight) + "," + (chartHeight/2) + ") rotate(-90)")
                    .text(options.chartAxisTitleY);

    } // setLayout
    function setScales() {

      // this functions sets a number of scales that translate the data values into drawing parameters.
      // the values are age, duration, year...
      // the drawing parameters are x, y, width, height, radius, colour.
      console.log("setScales");

      // set the color scales for age, duration and year
      ageColorScale = d3.scaleSequential(
                              d3.interpolate(options.ageColourMin,
                                             options.ageColourMax))
                        .domain([0,ageValues.length-1])
      durColorScale = d3.scaleSequential(
                              d3.interpolate(options.durColourMin,
                                             options.durColourMax))
                        .domain([0,durValues.length-1])
      yearColorScale = d3.scaleSequential(
                              d3.interpolate(options.yearColourMin,
                                             options.yearColourMax))
                        .domain([0,yearValues.length-1])

      // set the position scales:
      // this depends on the chart chartType
      // remember the x position could be based on the bScale (bands) or the tScale (time)
      if (options.chartType == "policies") {

        // draw rectangles with tScale and yScale
        // hide circles with bScale and rScale
        bScale.rangeRound([0, chartWidth])
              .domain(durValues);
        yScale.range([chartHeight , 0])
              .domain(polValues);
        rScale.range([0, 0])
              .domain([0, d3.max(shapeData.map(d => d[options.zVariable]))]);
        tScale.range([0, chartWidth])
              .domain(d3.extent([].concat(shapeData.map(d => parseTime(d.start)),
                                          shapeData.map(d => parseTime(d.end)))));

      } else if (options.chartType == "3D") {

        // hide rectangles (but keep tScale)
        // show circles at [bScale,yScale] with radius rScale

        // var combos = [];
        // durValues.forEach(function(a1){
        //   yearValues.forEach(function(a2){
        //     combos.push(a2 + "_" + a1);
        //   });
        // });

        bScale.rangeRound([0, chartWidth])
              .domain(yearDurValues);
        yScale.range([chartHeight , 0])
              .domain(ageValues);
        rScale.range([0, d3.min([bScale.bandwidth(), yScale.bandwidth()]) / 2])
              .domain([0, d3.max(shapeData.map(d => d[options.zVariable]))]);
        tScale.range([0, chartWidth])
              .domain(d3.extent([].concat(shapeData.map(d => parseTime(d.start)),
                                          shapeData.map(d => parseTime(d.end)))));

      } else if (options.chartType == "2D") {

        // hide rectangles (but keep tScale)
        // show circles at [bScale,yScale] with radius rScale

        bScale.rangeRound([0, chartWidth])
              .domain(durValues);
        yScale.range([chartHeight , 0])
              .domain(ageValues);
        rScale.range([0, d3.min([bScale.bandwidth(), yScale.bandwidth()]) / 2])
              .domain([0, d3.max(shapeData.map(d => d[options.zVariable]))]);
        tScale.range([0, chartWidth])
              .domain(d3.extent([].concat(shapeData.map(d => parseTime(d.start)),
                                          shapeData.map(d => parseTime(d.end)))));

      } else {
        // error?
      }

      console.log("z:  ", options.zVariable);
      console.log("zs:  ", shapeData.map(d => d[options.zVariable]) );
      console.log("max z", d3.max(shapeData.map(d => d[options.zVariable])));

    }


// ----------------------------------------------------------------------
//
//                      Draw Chart
//
// ----------------------------------------------------------------------

    function drawChart(transDuration = 1000){

      // this function draws the chart in two stages:
      drawAxes(transDuration)
      drawShapes(transDuration)


    } // drawChart
    function drawAxes(transDuration) {

      // This function draws the x and y axes
      console.log("drawAxes")

      // The pattern is that we create a "call" - a bit like a definition
      // and then we crete the axis by calling the definition.
      // the x axis depends on what chartView we are using (and remember the range may differ)
      if (options.chartType == "policies") {
        xAxisCall = d3.axisBottom(tScale).ticks(5).tickFormat(d3.timeFormat("%d-%b-%Y"))
      } else {
        xAxisCall  = d3.axisBottom(bScale);
      }
      xAxis.transition()
          .duration(transDuration)
          .attr("transform", "translate(0, " + (chartHeight + 0.5) + ")")
          .call(xAxisCall);

      // the yAxis always uses the same call (but remember the range may differ)
      yAxisCall  = d3.axisLeft(yScale).tickSize(5);
      yAxis.transition()
            .duration(transDuration)
            .call(yAxisCall);



    }
    function drawShapes(transDuration) {

      // This function draws the data linked shape.
      // It follows the 5 steps D3 update cycle...
      console.log("drawShapes")

      // 1. inititalize the data binding
      dataBinding = dataShapeContainer.selectAll(".exposure-shape").data(shapeData, d => d.id);

      // 2. remove any shapes if the linked data has been removed from the data set
      dataBinding.exit().remove();

      // 3. add the new data items in an "initial" state
      exposureShapeEnter = dataBinding.enter().append('g')
                        .attr('class', 'exposure-shape')
      exposureShapeEnter.append('circle')
            .attr("class", "exposure-circle")
            .attr("cx", d => {
              if (options.chartType == "policies") {
                return tScale(parseTime(d.end));
              } else if (options.chartType == "3D") {
              //  return bScale(d.dur + "_" + d.year) + bScale.bandwidth()/2;
                return bScale(d.year_dur) + bScale.bandwidth()/2;
              } else if (options.chartType == "2D") {
                return bScale(d.dur) + bScale.bandwidth()/2;
              } else {
                return 0
              }
            })
            .attr('cy', d => {
              if (options.chartType == "policies") {
                return yScale(d.pol_no);
              } else {
                return yScale(d.age) + yScale.bandwidth()/2;
              }
            })
            .attr("r", 1)
            .attr('fill', d => "#FFFFFF")
            .attr('fill-opacity', 1)
            .on('click',     d => clickData(d))
            .on("mouseover", d => mouseOverData(d))
            .on("mouseout",  d => mouseOutData(d))
            .on("mousemove", d => mouseMoveData(d));
      exposureShapeEnter.append('rect')
            .attr('class',  'exposure-rectangle')
            .attr('x',       d => {
              if (options.chartType == "policies") {
                return tScale(parseTime(d.start));
              } else if (options.chartType == "3D") {
                //return bScale(d.dur + "_" + d.year) + bScale.bandwidth()/2;
                return bScale(d.year_dur) + bScale.bandwidth()/2;
              } else if (options.chartType == "2D") {
                return bScale(d.dur) + bScale.bandwidth()/2;
              } else {
                return 0
              }

            })
            .attr('y',       d => {
              if (options.chartType == "policies") {
                return yScale(d.pol_no);
              } else {
                return yScale(d.age) + yScale.bandwidth()/2;
              }
            })
            .attr('height',  1)
            .attr('width',   1)
            .attr("fill",    d => "#FFFFFF" )
            .on('click',     d => clickData(d))
            .on("mouseover", d => mouseOverData(d))
            .on("mouseout",  d => mouseOutData(d))
            .on("mousemove", d => mouseMoveData(d));

      // 4. merge the existing and new data bindings into one object
      dataBinding = dataBinding.merge(exposureShapeEnter);

      // 5. update/move/resize the shapes referenced by the binding
      dataBinding.select('.exposure-circle')
            .transition()
            .duration(transDuration)
            .attr('fill', d => shapeColorScale(d.age, d.dur, d.year))
            .attr('cx', d => {
              if (options.chartType == "policies") {
                return tScale(parseTime(d.end));
              } else if (options.chartType == "3D") {
                //return bScale(d.dur + "_" + d.year) + bScale.bandwidth()/2;
                return bScale(d.year_dur) + bScale.bandwidth()/2;
              } else if (options.chartType == "2D") {
                return bScale(d.dur) + bScale.bandwidth()/2;
              } else {
                return 0;
              }
            })
            .attr('cy', d => {
              if (options.chartType == "policies") {
                return yScale(d.pol_no);
              } else {
                return yScale(d.age) + yScale.bandwidth()/2;
              }
            })
            .attr('r',  d => rScale(d[options.zVariable]));
        dataBinding.select('.exposure-rectangle')
                  .transition()
                  .duration(transDuration)
                  .attr('fill', d => shapeColorScale(d.age, d.dur, d.year))
                  .attr('x', d => {
                    if (options.chartType == "policies") {
                      return tScale(parseTime(d.start));
                    } else if (options.chartType == "3D") {
                      //return bScale(d.dur + "_" + d.year) + bScale.bandwidth()/2;
                      return bScale(d.year_dur) + bScale.bandwidth()/2;
                    } else if (options.chartType == "2D") {
                      return bScale(d.dur) + bScale.bandwidth()/2;
                    } else {
                      return 0
                    }

                  })
                  .attr('y',       d => {
                    if (options.chartType == "policies") {
                      return yScale(d.pol_no);
                    } else {
                      return yScale(d.age) + yScale.bandwidth()/2;
                    }
                  })
                  .attr('height',  d => yScale.bandwidth() * 0.9)
                  .attr('width',   d => {
                    if (options.chartType == "policies") {
                      return tScale(parseTime(d.end)) - tScale(parseTime(d.start));
                    } else {
                      return 0;
                    }
                  });



    }


// ----------------------------------------------------------------------
//
//                       Color Helper Functions
//
// ----------------------------------------------------------------------

    function parseColorHex(hexColor) {

      // converts #FF0010 to [255, 0, 16]
      var R = parseInt(hexColor.substring(1,3),16);
      var G = parseInt(hexColor.substring(3,5),16);
      var B = parseInt(hexColor.substring(5,7),16);
      return ([R,G,B])

    }
    function parseColorRgb(rgbString) {

      // converts "rgb(255,0,16]" to [255, 0, 16]
      rgbArray = rgbString.substring(4, rgbString.length-1)
               .replace(/ /g, '')
               .split(',')
               .map(item => parseInt(item, 10))
      return (rgbArray)

    }
    function deparseColorString(parsedColor) {

      // converts [255, 0, 16] to  #FF0010

      // extract the parts of the parsed color
      var R = parsedColor[0]
      var G = parsedColor[1]
      var B = parsedColor[2]

      // create the two character hex string e.g. turn 15 into "0F"
      var RR = ((R.toString(16).length==1) ? "0" + R.toString(16) : R.toString(16));
      var GG = ((G.toString(16).length==1) ? "0" + G.toString(16) : G.toString(16));
      var BB = ((B.toString(16).length==1) ? "0" + B.toString(16) : B.toString(16));

      return "#"+RR+GG+BB;

    }
    function combineThreeColors(c1, c2, c3) {

      // takes the max of each of the RGB values and returns as Hex

      // turn the RGB into array
      c1 = parseColorRgb(c1)
      c2 = parseColorRgb(c2)
      c3 = parseColorRgb(c3)

      // combine by taking the highest of the RGB values
      cX = [Math.max(c1[0], c2[0], c3[0]),
            Math.max(c1[1], c2[1], c3[1]),
            Math.max(c1[2], c2[2], c3[2])]

      // convert back into hex
      cX = deparseColorString(cX);

      return (cX)

    }
    function shapeColorScale(a, d, y) {

      // calculations the color given the age, duration, year values

      // get constituent colours as hex values
      aColor = ageColorScale(ageValues.indexOf(a));
      dColor = durColorScale(durValues.indexOf(d));
      yColor = yearColorScale(yearValues.indexOf(y));

      // parse - combine - deparse
      sColor = combineThreeColors(aColor, dColor, yColor);

      return(sColor)

    }


// ----------------------------------------------------------------------
//
//                       Event Handlers
//
// ----------------------------------------------------------------------

    function mouseOverData(d) {

      // called when the mouse enters a shape

      // show tooltip
      tooltip.style("opacity", 1)

      // send message to shiny (received as input$hoverDot)
      if (HTMLWidgets.shinyMode) {
          payload = { age: d.age,
                      dur: d.dur,
                      year: d.year,
                      exposure: d.exposure,
                      decrements: d.decrements};
          Shiny.onInputChange("hoverDot", payload);
      }

    }
    function mouseOutData(d) {

      // called when the mouse leaves a shape

      // hide tooltip
      tooltip.style("opacity", 0)

      // send message to shiny (received as input$hoverDot)
      if (HTMLWidgets.shinyMode) {
          payload = null;
          Shiny.onInputChange("hoverDot", payload);
      }
    }
    function mouseMoveData(d) {

      // called repeatedly when the mouse moves inside a shape

      // create the content for the tooltip
      var tooltipContent = [  "age:        " + d.age,
                              "dur:        " + d.dur,
                              "year:       " + d.year,
                              "exposure:   " + formatDecimal(d.exposure,2),
                              "decrements: " + d.decrements,
                              "rate:       " + formatPercent(d.decrate, 1),
                              "ID" + d.id]
                              .join("<br/>");

      // figure out where the tooltip should be
      var xPosition = d3.event.pageX + parseFloat(tooltip.attr("offset_x"));
      var yPosition = d3.event.pageY + parseFloat(tooltip.attr("offset_y"));

      // format the tooltip (content and position)
      tooltip
        .html(tooltipContent)
        .style("left", xPosition + "px")
        .style("top",  yPosition + "px")

    }
    function clickData(d) {

      // called when the mouse single clicks on a shape

      // if we are in a shiny app, we will sen the data item to the app
      // it will be receieved as input$clickedData
      if (HTMLWidgets.shinyMode) {
        payload = {data: d};
        Shiny.onInputChange("clickedData", payload);
      }

    }


// ----------------------------------------------------------------------
//
//                      Value Formatters
//
// ----------------------------------------------------------------------

    function formatValue(value, formatter, decPlaces) {

        if (formatter === undefined || formatter == null ) return(value);

        switch (formatter.toString().toLowerCase()) {
          case "money":
            return(formatMoney(value, decPlaces));
          case "integer":
            return(formatDecimal(value, 0));
          case "decimal":
            return(formatDecimal(value, decPlaces));
          case "percent":
            return(formatPercent(value, decPlaces));
          default:
            return(value.toString);
        }
    }
    function formatMoney(number, decPlaces) {
      var str = ""
      try {
        decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces;
        str = '£' + (number).toFixed(decPlaces).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
      }
      catch(error) {
        console.error("Error in formatMoney: " + number + ": " + decPlaces + "\n" + error);
      }
      return(str)
    }
    function formatDecimal(number, decPlaces) {
      var str = ""
      try {
        str = (number).toFixed(decPlaces).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
      }
      catch(error) {
        console.error("Error in formatMoney: " + number + ": " + decPlaces + "\n" + error);
      }
      return(str)
    }
    function formatPercent(number, decPlaces = 2) {
      var str = ""
      try {
        decPlaces = Math.abs(decPlaces) ||  2;
        str = (number*100).toFixed(decPlaces).concat("%")
      }
      catch(error) {
        console.error("Error in formatMoney: " + number + ": " + decPlaces + "\n" + error);
      }
      return(str)
    }
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }


// ----------------------------------------------------------------------
//
//                       Return widget
//
// ----------------------------------------------------------------------

    // this is what we provide to the HTML widget instance
    return {

      // is there a way to save the default options in JS (to make updates a lot cleaner?)

      renderValue: function(payload) {

        // read and interpret the meta data to decide what kind of chart we are drawing
        unpackOptions(payload.options);

        // process the data and extract binNames and clusterNames and summarise heights
        formatData(payload.data);

        // update the chart to reflect user selections / resizing etc
        setLayout(width, height);
        setScales();
        drawChart(transitionDuration);

      }, // renderValue

      resize: function(width, height) {

        // update the size of everything and redraw
        setLayout(width, height);
        setScales();
        drawChart(100);

      } // resize

    }; // return

  } // factory
});
