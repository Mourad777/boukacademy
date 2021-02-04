module.exports = (day) => {
    switch (day) {
        case "Sunday":
          index = 0;
          break;
        case "Monday":
          index = 1;
          break;
        case "Tuesday":
           index = 2;
          break;
        case "Wednesday":
          index = 3;
          break;
        case "Thursday":
          index = 4;
          break;
        case "Friday":
          index = 5;
          break;
        case "Saturday":
          index = 6;
    }
    return index
}