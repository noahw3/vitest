import { expect, test } from 'vitest'
import { createCLI, parseCLI } from '../../../packages/vitest/src/node/cli/cac.js'

const vitestCli = createCLI()

function parseArguments(commands: string, full = false) {
  const cliArgs = commands.trim().replace(/\s+/g, ' ').split(' ')
  const { options, args } = vitestCli.parse(['node', '/index.js', ...cliArgs], {
    run: false,
  })
  // remove -- and color from the options since they are always present
  if (!full) {
    delete options['--']
    delete options.color
  }

  return { options, args }
}

function getCLIOptions(commands: string) {
  return parseArguments(commands).options
}

const enabled = { enabled: true }
const disabled = { enabled: false }

test('top level nested options return boolean', async () => {
  expect(getCLIOptions('--coverage --browser --typecheck')).toEqual({
    coverage: enabled,
    browser: enabled,
    typecheck: enabled,
  })
})

test('negated top level nested options return boolean', async () => {
  expect(getCLIOptions('--no-coverage --no-browser --no-typecheck')).toEqual({
    coverage: disabled,
    browser: disabled,
    typecheck: disabled,
  })
})

test('nested coverage options have correct types', async () => {
  expect(getCLIOptions(`
    --coverage.all
    --coverage.enabled=true
    --coverage.clean false
    --coverage.cleanOnRerun true
    --coverage.reportOnFailure
    --coverage.allowExternal false
    --coverage.skipFull
    --coverage.thresholds.autoUpdate true
    --coverage.thresholds.perFile
    ${/* even non-boolean should be treated as boolean */ ''}
    --coverage.thresholds.100 25

    --coverage.provider v8
    --coverage.reporter text
    --coverage.reportsDirectory .\\dist\\coverage
    --coverage.customProviderModule=./folder/coverage.js

    --coverage.ignoreClassMethods method1
    --coverage.ignoreClassMethods method2

    --coverage.processingConcurrency 2
    --coverage.thresholds.statements 80
    --coverage.thresholds.lines 100
    --coverage.thresholds.functions 30
    --coverage.thresholds.branches 25

    --coverage.watermarks.statements 50,80
    --coverage.watermarks.lines=30,40
    --coverage.watermarks.branches=70,80
    --coverage.watermarks.functions 20,60
  `).coverage).toEqual({
    enabled: true,
    reporter: ['text'],
    all: true,
    provider: 'v8',
    clean: false,
    cleanOnRerun: true,
    reportsDirectory: 'dist/coverage',
    customProviderModule: 'folder/coverage.js',
    reportOnFailure: true,
    allowExternal: false,
    skipFull: true,
    ignoreClassMethods: ['method1', 'method2'],
    processingConcurrency: 2,
    thresholds: {
      statements: 80,
      lines: 100,
      functions: 30,
      branches: 25,
      perFile: true,
      autoUpdate: true,
      100: true,
    },
    watermarks: {
      statements: [50, 80],
      lines: [30, 40],
      branches: [70, 80],
      functions: [20, 60],
    },
  })
})

test('correctly normalizes methods to be an array', async () => {
  expect(getCLIOptions(`
    --coverage.ignoreClassMethods method2
    --coverage.include pattern
    --coverage.exclude pattern
  `)).toMatchObject({
    coverage: {
      ignoreClassMethods: ['method2'],
      include: ['pattern'],
      exclude: ['pattern'],
    },
  })
})

test('all coverage enable options are working correctly', () => {
  expect(getCLIOptions('--coverage').coverage).toEqual({ enabled: true })
  expect(getCLIOptions('--coverage.enabled --coverage.all=false').coverage).toEqual({ enabled: true, all: false })
  expect(getCLIOptions('--coverage.enabled --coverage.all').coverage).toEqual({ enabled: true, all: true })
})

test('fails when an array is passed down for a single value', async () => {
  expect(() => getCLIOptions('--coverage.provider v8 --coverage.provider istanbul'))
    .toThrowErrorMatchingInlineSnapshot(`[Error: Expected a single value for option "--coverage.provider <name>", received ["v8", "istanbul"]]`)
})

test('even if coverage is boolean, don\'t fail', () => {
  expect(getCLIOptions('--coverage --coverage.provider v8').coverage).toEqual({
    enabled: true,
    provider: 'v8',
  })
})

test('array options', () => {
  expect(getCLIOptions('--reporter json --coverage.reporter=html --coverage.extension ts')).toMatchInlineSnapshot(`
    {
      "coverage": {
        "extension": [
          "ts",
        ],
        "reporter": [
          "html",
        ],
      },
      "reporter": [
        "json",
      ],
    }
  `)

  expect(getCLIOptions(`
  --reporter json
  --reporter=default
  --coverage.reporter=json
  --coverage.reporter html
  --coverage.extension=ts
  --coverage.extension=tsx
  `)).toMatchInlineSnapshot(`
    {
      "coverage": {
        "extension": [
          "ts",
          "tsx",
        ],
        "reporter": [
          "json",
          "html",
        ],
      },
      "reporter": [
        "json",
        "default",
      ],
    }
  `)
})

test('hookTimeout is parsed correctly', () => {
  expect(getCLIOptions('--hookTimeout 1000')).toEqual({ hookTimeout: 1000 })
  expect(getCLIOptions('--hook-timeout 1000')).toEqual({ hookTimeout: 1000 })
  expect(getCLIOptions('--hook-timeout=1000')).toEqual({ hookTimeout: 1000 })
  expect(getCLIOptions('--hookTimeout=1000')).toEqual({ hookTimeout: 1000 })
})

test('teardownTimeout is parsed correctly', () => {
  expect(getCLIOptions('--teardownTimeout 1000')).toEqual({ teardownTimeout: 1000 })
  expect(getCLIOptions('--teardown-timeout 1000')).toEqual({ teardownTimeout: 1000 })
  expect(getCLIOptions('--teardownTimeout=1000')).toEqual({ teardownTimeout: 1000 })
  expect(getCLIOptions('--teardown-timeout=1000')).toEqual({ teardownTimeout: 1000 })
})

test('slowTestThreshold is parsed correctly', () => {
  expect(getCLIOptions('--slowTestThreshold 1000')).toEqual({ slowTestThreshold: 1000 })
  expect(getCLIOptions('--slow-test-threshold 1000')).toEqual({ slowTestThreshold: 1000 })
  expect(getCLIOptions('--slowTestThreshold=1000')).toEqual({ slowTestThreshold: 1000 })
  expect(getCLIOptions('--slow-test-threshold=1000')).toEqual({ slowTestThreshold: 1000 })
})

test('maxConcurrency is parsed correctly', () => {
  expect(getCLIOptions('--maxConcurrency 1000')).toEqual({ maxConcurrency: 1000 })
  expect(getCLIOptions('--max-concurrency 1000')).toEqual({ maxConcurrency: 1000 })
  expect(getCLIOptions('--maxConcurrency=1000')).toEqual({ maxConcurrency: 1000 })
  expect(getCLIOptions('--max-concurrency=1000')).toEqual({ maxConcurrency: 1000 })
})

test('cache is parsed correctly', () => {
  expect(getCLIOptions('--cache')).toEqual({ cache: {} })
  expect(getCLIOptions('--no-cache')).toEqual({ cache: false })

  expect(getCLIOptions('--cache.dir=./test/cache.json')).toEqual({
    cache: { dir: 'test/cache.json' },
  })
  expect(getCLIOptions('--cache.dir ./test/cache.json')).toEqual({
    cache: { dir: 'test/cache.json' },
  })
  expect(getCLIOptions('--cache.dir .\\test\\cache.json')).toEqual({
    cache: { dir: 'test/cache.json' },
  })
})

test('typecheck correctly passes down arguments', () => {
  const { options, args } = parseArguments('--typecheck some.name.ts')
  expect(options).toEqual({ typecheck: { enabled: true } })
  expect(args).toEqual(['some.name.ts'])
})

test('browser as implicit boolean', () => {
  const { options, args } = parseArguments('--browser', false)
  expect(options).toEqual({ browser: { enabled: true } })
  expect(args).toEqual([])
})

test('browser as explicit boolean', () => {
  const { options, args } = parseArguments('--browser=true', false)
  expect(options).toEqual({ browser: { enabled: true } })
  expect(args).toEqual([])
})

test('browser as explicit boolean with space', () => {
  const { options, args } = parseArguments('--browser true', false)
  expect(options).toEqual({ browser: { enabled: true } })
  expect(args).toEqual([])
})

test('browser by name', () => {
  const { options, args } = parseArguments('--browser=firefox', false)

  expect(args).toEqual([])
  expect(options).toEqual({ browser: { enabled: true, name: 'firefox' } })
})

test('public parseCLI works correctly', () => {
  expect(parseCLI('vitest dev')).toEqual({
    filter: [],
    options: {
      'watch': true,
      '--': [],
      'color': true,
    },
  })
  expect(parseCLI('vitest watch')).toEqual({
    filter: [],
    options: {
      'watch': true,
      '--': [],
      'color': true,
    },
  })
  expect(parseCLI('vitest run')).toEqual({
    filter: [],
    options: {
      'run': true,
      '--': [],
      'color': true,
    },
  })
  expect(parseCLI('vitest related ./some-files.js')).toEqual({
    filter: [],
    options: {
      'passWithNoTests': true,
      'related': ['./some-files.js'],
      '--': [],
      'color': true,
    },
  })

  expect(parseCLI('vitest --coverage --browser=chrome')).toEqual({
    filter: [],
    options: {
      'coverage': { enabled: true },
      'browser': { enabled: true, name: 'chrome' },
      '--': [],
      'color': true,
    },
  })

  expect(parseCLI('vitest ./tests.js --coverage')).toEqual({
    filter: ['./tests.js'],
    options: {
      'coverage': { enabled: true },
      '--': [],
      'color': true,
    },
  })

  expect(parseCLI('vitest ./tests.js --coverage --custom-options', { allowUnknownOptions: true })).toEqual({
    filter: ['./tests.js'],
    options: {
      'coverage': { enabled: true },
      'customOptions': true,
      '--': [],
      'color': true,
    },
  })

  expect(() => {
    parseCLI('node --test --coverage --browser --typecheck')
  }).toThrowError(`Expected "vitest" as the first argument, received "node"`)
})
