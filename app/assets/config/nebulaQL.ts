const nebulaWordsUppercase = [
  'ALTER',
  'AND',
  'AS',
  'CREATE',
  'DELETE',
  'DESCRIBE',
  'DROP',
  'EDGE',
  'EDGES',
  'FETCH',
  'FIND',
  'FROM',
  'INSERT',
  'GO',
  'OVER',
  'PROP',
  'RETURN',
  'REVERSELY',
  'SET',
  'SHOW',
  'SPACE',
  'SPACES',
  'TAG',
  'TAGS',
  'UPDATE',
  'VALUES',
  'VERTEX',
  'WHERE',
  'YIELD',
  'YIELD',
];

export const ban = ['use', 'USE'];

export const operators = [
  // Bitwise Operator
  '&',
  '|',
  '^',
  // Math
  'abs',
  'floor',
  'ceil',
  'round',
  'sqrt',
  'cbrt',
  'hypot',
  'pow',
  'exp',
  'exp2',
  'log',
  'log2',
  'sin',
  'asin',
  'cos',
  'acos',
  'tan',
  'atan',
  'rand32',
  'rand64',
  // String
  'strcasecmp',
  'lower',
  'upper',
  'length',
  'trim',
  'ltrim',
  'rtrim',
  'left',
  'right',
  'lpad',
  'rpad',
  'substr',
  'hash',
  // Timestamp
  'now',
  // Comparison Functions And Operators
  '=',
  '/',
  '==',
  '!=',
  '<',
  '<=',
  '-',
  '%',
  '+',
  '*',
  '-',
  'udf_is_in',
  // Aggregate
  'AVG',
  'COUNT',
  'MAX',
  'MIN',
  'STD',
  'SUM',
  // Logical Operator
  '&&',
  '!',
  '||',
  'XOR',
  // Order by Function
  'ORDER',
  'BY',
  'DESC',
  'ASC',
  // Limit
  'LIMIT',
  // Set Operations
  'UNION',
  'INTERSECT',
  'MINUS',
  // uuid
  'uuid',
];

const nebulaWordsLowercase = nebulaWordsUppercase.map(w => w.toLowerCase());

export const keyWords = [...nebulaWordsUppercase, ...nebulaWordsLowercase];

export const maxLineNum = 20;
