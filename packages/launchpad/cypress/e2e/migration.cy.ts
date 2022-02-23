import type { e2eProjectDirs } from '@packages/frontend-shared/cypress/e2e/support/e2eProjectDirs'

const renameAutoStep = `[data-cy="migration-step renameAuto"]`
const renameManualStep = `[data-cy="migration-step renameManual"]`
const renameSupportStep = `[data-cy="migration-step renameSupport"]`
const configFileStep = `[data-cy="migration-step configFile"]`
const setupComponentStep = `[data-cy="migration-step setupComponent"]`

declare global {
  namespace Cypress {
    interface Chainable {
      waitForWizard(): Cypress.Chainable<JQuery<HTMLDivElement>>
    }
  }
}

Cypress.Commands.add('waitForWizard', () => {
  return cy.get('[data-cy="migration-wizard"]')
})

function startMigrationFor (project: typeof e2eProjectDirs[number]) {
  cy.scaffoldProject(project)
  cy.openProject(project)
  cy.visitLaunchpad()
  cy.waitForWizard()
}

function skipCTMigration () {
  cy.contains(`I'll do this later`).click()
}

function migrateAndVerifyConfig (configExtension: 'js' | 'ts' | 'coffee' = 'js') {
  cy.contains('Migrate the configuration for me').click()

  cy.withCtx(async (ctx, o) => {
    const configStats = await ctx.actions.file.checkIfFileExists(`cypress.config.${o.configExtension}`)

    expect(configStats).to.not.be.null.and.not.be.undefined

    const oldConfigStats = await ctx.actions.file.checkIfFileExists('cypress.json')

    expect(oldConfigStats).to.be.null

    await ctx.actions.migration.assertSuccessfulConfigMigration(o.configExtension)
  }, { configExtension })
}

function finishMigrationAndContinue () {
  cy.contains('Finish migration and continue').click()
}

function checkOutcome () {
  cy.contains('Welcome to Cypress!').should('be.visible')
}

function runAutoRename () {
  cy.get('button').contains('Rename these specs for me').click()
}

function renameSupport (lang: 'js' | 'ts' | 'coffee' = 'js') {
  cy.contains(`Rename the support file for me`).click()

  // give to to finish the file rename
  cy.wait(200)

  cy.withCtx(async (ctx, { lang }) => {
    expect(
      await ctx.actions.file.checkIfFileExists(ctx.path.join('cypress', 'support', `e2e.${lang}`)), 'support file not renamed',
    ).not.to.be.null
  }, { lang })
}

describe('Full migration flow for each project', { retries: { openMode: 2, runMode: 2 } }, () => {
  it('completes journey for migration-component-testing', () => {
    startMigrationFor('migration-component-testing')
    // custom testFiles - cannot auto
    cy.get(renameAutoStep).should('not.exist')
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('not.exist')
    cy.get(setupComponentStep).should('exist')
    cy.get(configFileStep).should('exist')

    migrateAndVerifyConfig()
    finishMigrationAndContinue()
    checkOutcome()
  })

  it('completes journey for migration-component-testing-defaults', () => {
    startMigrationFor('migration-component-testing-defaults')
    // default testFiles - auto
    cy.get(renameAutoStep).should('exist')
    cy.get(renameManualStep).should('exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('not.exist')
    cy.get(setupComponentStep).should('exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('cypress/component/button.spec.js')
    cy.contains('cypress/component/input-spec.tsx')

    // after auto migration
    cy.contains('cypress/component/button.cy.js')
    cy.contains('cypress/component/input.cy.tsx')

    runAutoRename()

    cy.wait(100)
    cy.withCtx(async (ctx) => {
      const specs = [
        'cypress/component/button.cy.js',
        'cypress/component/input.cy.tsx',
      ]

      for (const spec of specs) {
        const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

        expect(stats).to.not.be.null
      }
    })

    skipCTMigration()
    migrateAndVerifyConfig()
    finishMigrationAndContinue()
    checkOutcome()
  })

  describe('migration-e2e-component-default-everything', () => {
    it('completes journey for migration-e2e-component-default-everything', () => {
      startMigrationFor('migration-e2e-component-default-everything')
      // default testFiles - auto
      cy.get(renameAutoStep).should('exist')
      cy.get(renameManualStep).should('exist')
      cy.get(renameSupportStep).should('exist')
      cy.get(setupComponentStep).should('exist')
      cy.get(configFileStep).should('exist')

      // Migration workflow
      // before auto migration
      cy.contains('cypress/integration/foo.spec.ts')
      cy.contains('cypress/integration/spec.ts')
      cy.contains('cypress/component/button.spec.js')

      // after auto migration
      cy.contains('cypress/e2e/foo.cy.ts')
      cy.contains('cypress/e2e/spec.cy.ts')
      cy.contains('cypress/component/button.cy.js')

      runAutoRename()

      cy.wait(100)

      cy.withCtx(async (ctx) => {
        const specs = [
          'cypress/e2e/foo.cy.ts',
          'cypress/component/button.cy.js',
        ]

        for (const spec of specs) {
          const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

          expect(stats).to.not.be.null
        }
      })

      skipCTMigration()
      renameSupport()
      migrateAndVerifyConfig()
      finishMigrationAndContinue()

      cy.withCtx(async (ctx) => {
        const integrationFolderStats = await ctx.actions.file.checkIfFileExists(ctx.path.join('cypress', 'integration'))

        expect(integrationFolderStats).to.be.null
      })

      checkOutcome()
    })

    it('renames only the folder renaming migration-e2e-component-default-everything', () => {
      startMigrationFor('migration-e2e-component-default-everything')
      // default testFiles - auto
      cy.get(renameAutoStep).should('exist')
      cy.get(renameManualStep).should('exist')
      // supportFile is false - cannot migrate
      cy.get(renameSupportStep).should('exist')
      cy.get(setupComponentStep).should('exist')
      cy.get(configFileStep).should('exist')

      // Migration workflow
      // before auto migration
      cy.contains('cypress/integration/foo.spec.ts')
      cy.contains('cypress/component/button.spec.js')

      // after auto migration
      cy.contains('cypress/e2e/foo.cy.ts')
      cy.contains('cypress/component/button.cy.js')

      cy.findByText('change').click()

      cy.get('[data-cy=migration-button-proceed]').click()

      // this project has a default integration folder and default testFiles.
      // We rename the integration folder, even if the user skips the spec rename
      cy.findByText('Rename folder only.').click()

      cy.findByText('Save Changes').click()

      cy.findByText('Rename the folder for me').click()

      // move component specs later
      skipCTMigration()

      cy.wait(100)

      cy.withCtx(async (ctx) => {
        const specs = [
          'cypress/e2e/foo.spec.ts',
          'cypress/component/button.spec.js',
        ]

        for (const spec of specs) {
          const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

          expect(stats).to.not.be.null
        }
      })

      renameSupport()
      migrateAndVerifyConfig()
      finishMigrationAndContinue()
      checkOutcome()
    })
  })

  it('completes journey for migration-e2e-custom-integration', () => {
    startMigrationFor('migration-e2e-custom-integration')
    // default testFiles but custom integration - can rename automatically
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('src/basic.spec.js')

    // after auto migration
    cy.contains('src/basic.cy.js')

    runAutoRename()

    cy.wait(100)

    cy.withCtx(async (ctx) => {
      const specs = ['src/basic.cy.js']

      for (const spec of specs) {
        const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

        expect(stats).to.not.be.null
      }
    })

    renameSupport()
    migrateAndVerifyConfig()
    checkOutcome()
  })

  it('completes journey for migration-e2e-custom-test-files', () => {
    startMigrationFor('migration-e2e-custom-test-files')
    // default integration but custom testFiles
    // can rename integration->e2e
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    startMigrationFor('migration-e2e-custom-test-files')
    // default testFiles but custom integration - can rename automatically
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('cypress/integration/basic.test.js')

    // after auto migration
    cy.contains('cypress/e2e/basic.test.js')

    runAutoRename()

    cy.wait(100)

    cy.withCtx(async (ctx) => {
      const specs = ['cypress/e2e/basic.test.js']

      for (const spec of specs) {
        const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

        expect(stats).to.not.be.null
      }
    })

    renameSupport()
    migrateAndVerifyConfig()
    checkOutcome()
  })

  it('completes journey for migration-e2e-defaults', () => {
    startMigrationFor('migration-e2e-defaults')
    // defaults, rename all the things
    // can rename integration->e2e
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // default testFiles but custom integration - can rename automatically
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('cypress/integration/foo.spec.js')

    // after auto migration
    cy.contains('cypress/e2e/foo.cy.js')

    runAutoRename()

    cy.wait(100)

    cy.withCtx(async (ctx) => {
      const specs = ['cypress/e2e/foo.cy.js']

      for (const spec of specs) {
        const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

        expect(stats, `spec file not renamed ${spec}`).to.not.be.null
      }
    })

    renameSupport('ts')
    migrateAndVerifyConfig()
    checkOutcome()
  })

  it('completes journey for migration-e2e-coffeescript', () => {
    startMigrationFor('migration-e2e-coffeescript')
    // defaults, rename all the things
    // can rename integration->e2e
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('cypress/integration/foo.spec.coffee')

    // after auto migration
    cy.contains('cypress/e2e/foo.cy.coffee')

    runAutoRename()

    cy.wait(100)

    cy.withCtx(async (ctx) => {
      const specs = ['cypress/e2e/foo.cy.coffee']

      for (const spec of specs) {
        const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

        expect(stats, `spec file not renamed ${spec}`).to.not.be.null
      }
    })

    renameSupport('coffee')
    migrateAndVerifyConfig()
    checkOutcome()
  })

  it('completes journey for migration-e2e-no-plugins-support-file', () => {
    startMigrationFor('migration-e2e-no-plugins-support-file')
    // defaults, rename all the things
    // can rename integration->e2e
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // no supportFile
    cy.get(renameSupportStep).should('not.exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // default testFiles but custom integration - can rename automatically
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('not.exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('cypress/integration/foo.spec.js')

    // after auto migration
    cy.contains('cypress/e2e/foo.cy.js')

    runAutoRename()

    migrateAndVerifyConfig()
    checkOutcome()
  })

  // TODO: Do we need to consider this case?
  it.skip('completes journey for migration-e2e-defaults-no-specs', () => {
    startMigrationFor('migration-e2e-defaults-no-specs')
    // no specs, nothing to rename?
    cy.get(renameAutoStep).should('not.exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    renameSupport()
    migrateAndVerifyConfig()
    checkOutcome()
  })

  it('completes journey for migration-e2e-fully-custom', () => {
    startMigrationFor('migration-e2e-fully-custom')
    // integration folder and testFiles are custom, cannot rename anything
    cy.get(renameAutoStep).should('not.exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is custom - cannot rename
    cy.get(renameSupportStep).should('not.exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    migrateAndVerifyConfig()
    checkOutcome()
  })

  it('completes journey for migration-component-testing-customized', () => {
    startMigrationFor('migration-component-testing-customized')
    // cannot rename anything automatically here, testFiles are customized
    cy.get(renameAutoStep).should('not.exist')

    cy.get(renameManualStep).should('not.exist')

    // no supportFile rename for CT
    cy.get(renameSupportStep).should('not.exist')

    cy.get(setupComponentStep).should('exist')
    cy.get(configFileStep).should('exist')

    migrateAndVerifyConfig()
    finishMigrationAndContinue()
    checkOutcome()
  })

  it('completes journey for migration-typescript-project', () => {
    startMigrationFor('migration-typescript-project')
    // defaults, rename all the things
    // can rename integration->e2e
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // default testFiles but custom integration - can rename automatically
    cy.get(renameAutoStep).should('exist')
    // no CT
    cy.get(renameManualStep).should('not.exist')
    // supportFile is false - cannot migrate
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('not.exist')
    cy.get(configFileStep).should('exist')

    // Migration workflow
    // before auto migration
    cy.contains('cypress/integration/foo.spec.js')

    // after auto migration
    cy.contains('cypress/e2e/foo.cy.js')

    runAutoRename()

    cy.wait(100)
    cy.withCtx((ctx) => {
      ['cypress/e2e/foo.cy.js'].forEach(async (spec) => {
        const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

        expect(stats).to.not.be.null
      })
    })

    renameSupport()
    migrateAndVerifyConfig('ts')
    checkOutcome()
  })

  context('migration-e2e-component-default-test-files', () => {
    it('completes journey', () => {
      startMigrationFor('migration-e2e-component-default-test-files')
      // default testFiles - auto
      cy.get(renameAutoStep).should('exist')
      cy.get(renameManualStep).should('not.exist')
      // supportFile is false - cannot migrate
      cy.get(renameSupportStep).should('exist')
      cy.get(setupComponentStep).should('exist')
      cy.get(configFileStep).should('exist')

      // Migration workflow
      // before auto migration
      cy.contains('cypress/custom-integration/foo.spec.ts')
      cy.contains('cypress/custom-component/button.spec.js')

      // after auto migration
      cy.contains('cypress/custom-integration/foo.cy.ts')
      cy.contains('cypress/custom-component/button.cy.js')

      runAutoRename()

      cy.wait(100)

      cy.withCtx(async (ctx) => {
        const specs = [
          'cypress/custom-integration/foo.cy.ts',
          'cypress/custom-component/button.cy.js',
        ]

        for (const spec of specs) {
          const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

          expect(stats).to.not.be.null
        }
      })

      renameSupport()
      migrateAndVerifyConfig()
      finishMigrationAndContinue()
    })

    it('skips the file renaming', () => {
      startMigrationFor('migration-e2e-component-default-test-files')
      // default testFiles - auto
      cy.get(renameAutoStep).should('exist')
      // non default component folder - should skip.
      cy.get(renameManualStep).should('not.exist')
      // supportFile is false - cannot migrate
      cy.get(renameSupportStep).should('exist')
      cy.get(setupComponentStep).should('exist')
      cy.get(configFileStep).should('exist')

      // Migration workflow
      // before auto migration
      cy.contains('cypress/custom-integration/foo.spec.ts')
      cy.contains('cypress/custom-component/button.spec.js')

      // after auto migration
      cy.contains('cypress/custom-integration/foo.cy.ts')
      cy.contains('cypress/custom-component/button.cy.js')

      cy.findByText('change').click()

      cy.get('[data-cy=migration-button-proceed]').click()

      cy.findByText('Don\'t rename anything — keep what I have.').click()

      cy.findByText('Save Changes').click()

      cy.findByText('Skip renaming specs').click()

      cy.withCtx(async (ctx) => {
        const specs = [
          'cypress/custom-integration/foo.spec.ts',
          'cypress/custom-component/button.spec.js',
        ]

        for (const spec of specs) {
          const stats = await ctx.actions.file.checkIfFileExists(ctx.path.join(spec))

          expect(stats).to.not.be.null
        }
      })

      renameSupport()
      migrateAndVerifyConfig()
    })
  })
})

// TODO: toLaunchpad emitter not working in Cypress in Cypress.
describe.skip('component testing migration - defaults', () => {
  it('live update migration UI as user moves files', () => {
    cy.scaffoldProject('migration-component-testing-customized')
    cy.openProject('migration-component-testing-customized')
    cy.visitLaunchpad()
    cy.waitForWizard()

    // need to move your specs before this button shows
    cy.get('button').contains('I have moved my component specs').should('not.exist')

    // two files to move, src/button.spec.js and src/input-spec.tsx.
    cy.withCtx((ctx) => {
      return ctx.actions.file.moveFileInProject('src/button.spec.js', 'src/button.cy.js')
    }).then(() => {
      cy.get('[data-cy="moved"]').contains('src/button.spec.js')
    })

    cy.withCtx((ctx) => {
      return ctx.actions.file.moveFileInProject('src/input-spec.tsx', 'src/input.cy.tsx')
    }).then(() => {
      cy.get('[data-cy="moved"]').contains('src/input-spec.tsx')
    })

    cy.get('button').contains('I have moved my component specs')
  })

  it('live update migration UI as user moves files', () => {
    cy.scaffoldProject('migration-component-testing-customized')
    cy.openProject('migration-component-testing-customized')
    cy.visitLaunchpad()
    cy.waitForWizard()

    // need to move your specs before this button shows
    cy.get('button').contains('I have moved my component specs').should('not.exist')

    // two files to move, src/button.spec.js and src/input-spec.tsx.
    cy.withCtx((ctx) => {
      return ctx.actions.file.moveFileInProject('src/button.spec.js', 'src/button.cy.js')
    }).then(() => {
      cy.get('[data-cy="moved"]').contains('src/button.spec.js')
    })

    cy.withCtx((ctx) => {
      return ctx.actions.file.moveFileInProject('src/input-spec.tsx', 'src/input.cy.tsx')
    }).then(() => {
      cy.get('[data-cy="moved"]').contains('src/input-spec.tsx')
    })

    cy.get('button').contains('I have moved my component specs')
  })
})

describe('Migration', { viewportWidth: 1200, retries: { openMode: 2, runMode: 2 } }, () => {
  it('should create the cypress.config.js file and delete old config', () => {
    startMigrationFor('migration')

    // all steps
    cy.get(renameAutoStep).should('exist')
    cy.get(renameManualStep).should('not.exist')
    cy.get(renameSupportStep).should('exist')
    cy.get(setupComponentStep).should('exist')
    cy.get(configFileStep).should('exist')

    cy.get('button').contains('Rename these specs for me').scrollIntoView().click()
    cy.findByText('Rename the support file for me').click()
    cy.findByText('Migrate the configuration for me').click()

    cy.withCtx(async (ctx) => {
      const configStats = await ctx.actions.file.checkIfFileExists('cypress.config.js')

      expect(configStats).to.not.be.null.and.not.be.undefined

      const oldConfigStats = await ctx.actions.file.checkIfFileExists('cypress.json')

      expect(oldConfigStats).to.be.null

      await ctx.actions.migration.assertSuccessfulConfigMigration()
    })

    finishMigrationAndContinue()
    checkOutcome()
  })
})
