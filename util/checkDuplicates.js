const checkDuplicates = (arr) => {
  const duplicates = (arr || []).reduce((acc, el, i, arr) => {
    if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el);
    return acc;
  }, []);
  return duplicates;
};

exports.checkDuplicates = checkDuplicates;
