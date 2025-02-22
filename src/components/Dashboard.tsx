import { useTranslation } from 'react-i18next'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { safeName } from '../lib/name-helper'
import { Budget, BudgetMonth, Translation, UUID } from '../types'
import { CalendarDaysIcon } from '@heroicons/react/24/solid'
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/20/solid'
import { get } from '../lib/api/base'
import { formatMoney } from '../lib/format'
import isSupported from '../lib/is-supported'
import LoadingSpinner from './LoadingSpinner'
import Error from './Error'
import {
  dateFromMonthYear,
  monthYearFromDate,
  translatedMonthFormat,
  shortTranslatedMonthFormat,
} from '../lib/dates'
import CategoryMonth from './CategoryMonth'
import MonthPicker from './MonthPicker'
import QuickAllocationForm from './QuickAllocationForm'

type DashboardProps = { budget: Budget }

const previousMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-')

  if (month === '01') {
    return new Date(parseInt(year) - 1, 11, 15)
  } else {
    return new Date(parseInt(year), parseInt(month) - 2, 15)
  }
}

const nextMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-')

  if (month === '12') {
    return new Date(parseInt(year) + 1, 0, 15)
  } else {
    return new Date(parseInt(year), parseInt(month), 15)
  }
}

const linkToMonth = (month: string) => `/?month=${month}`

const Dashboard = ({ budget }: DashboardProps) => {
  const { t }: Translation = useTranslation()
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const activeMonth =
    searchParams.get('month')?.substring(0, 7) || monthYearFromDate(new Date())

  const [budgetMonth, setBudgetMonth] = useState<BudgetMonth>()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [editingEnvelope, setEditingEnvelope] = useState<UUID>()

  const useNativeMonthPicker = isSupported.inputTypeMonth()

  const replaceMonthInLinks = useCallback(
    (link: string) => {
      const [year, month] = activeMonth.split('-')
      return link.replace('YYYY', year).replace('MM', month)
    },
    [activeMonth]
  )

  const loadBudgetMonth = useCallback(async () => {
    return get(replaceMonthInLinks(budget.links.groupedMonth))
      .then(data => {
        setBudgetMonth(data)
        if (error) {
          setError('')
        }
      })
      .catch(err => {
        setError(err)
      })
  }, [budget, activeMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadBudgetMonth().then(() => setIsLoading(false))
  }, [loadBudgetMonth, budget, activeMonth])

  const reloadBudgetMonth = () => {
    setIsLoading(true)
    loadBudgetMonth().then(() => setIsLoading(false))
  }

  return (
    <div className="dashboard">
      <div className="header">
        <h1>{safeName(budget, 'budget')}</h1>
      </div>

      <div className="month-slider">
        <Link
          to={linkToMonth(monthYearFromDate(previousMonth(activeMonth)))}
          title={translatedMonthFormat.format(previousMonth(activeMonth))}
          onClick={() => setIsLoading(true)}
        >
          <ChevronLeftIcon className="inline h-6" />
          {shortTranslatedMonthFormat.format(previousMonth(activeMonth))}
        </Link>
        <div className="border-red-800 dark:border-red-600">
          {useNativeMonthPicker ? (
            <div className="text-center">
              <label htmlFor="month" className="sr-only">
                {t('dashboard.selectMonth')}
              </label>
              <input
                type="month"
                id="month"
                value={activeMonth}
                className="border-none cursor-pointer text-center"
                onChange={e => {
                  e.preventDefault()
                  navigate(linkToMonth(e.target.value))
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <span className="mr-2 text-center">
                {translatedMonthFormat.format(dateFromMonthYear(activeMonth))}
              </span>
              <button
                type="button"
                title={t('dashboard.selectMonth')}
                onClick={() => {
                  setShowMonthPicker(!showMonthPicker)
                }}
              >
                <CalendarDaysIcon className="icon" />
              </button>
            </div>
          )}
        </div>
        <Link
          to={linkToMonth(monthYearFromDate(nextMonth(activeMonth)))}
          title={translatedMonthFormat.format(nextMonth(activeMonth))}
          onClick={() => setIsLoading(true)}
        >
          {shortTranslatedMonthFormat.format(nextMonth(activeMonth))}
          <ChevronRightIcon className="inline h-6" />
        </Link>
      </div>

      {useNativeMonthPicker ? null : (
        <MonthPicker
          open={showMonthPicker}
          setOpen={setShowMonthPicker}
          activeMonth={activeMonth}
        />
      )}

      {isLoading || !budgetMonth ? (
        <LoadingSpinner />
      ) : (
        <>
          <Error error={error} />
          <div className="box w-full mt-4 mb-2 py-2 text-center">
            <div
              className={`${
                Number(budgetMonth.available) >= 0 ? 'positive' : 'negative'
              } text-xl font-bold`}
            >
              {formatMoney(budgetMonth.available, budget.currency, {
                signDisplay: 'auto',
              })}
            </div>
            <div className="text-gray-500 dark:text-gray-400 font-medium">
              {t('dashboard.available')}
            </div>
          </div>
          <div className="box text-center py-2 px-4 text-sm font-medium">
            <QuickAllocationForm
              link={replaceMonthInLinks(budget.links.monthAllocations)}
              reloadBudgetMonth={reloadBudgetMonth}
            />
          </div>

          <div className="px-4 sm:px-6 lg:px-8">
            <div className="mt-4 flex flex-col py-2">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8 md:card">
                <div className="inline-block w-full align-middle">
                  <table className="w-full table-fixed">
                    <thead className="bg-white dark:bg-slate-800">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-300 sm:pl-6 w-1/2"
                        ></th>
                        <th
                          scope="col"
                          className="px-3 pt-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-300 w-1/4 md:w-1/6"
                        >
                          {t('dashboard.allocation')}
                        </th>
                        <th
                          scope="col"
                          className="hidden md:table-cell px-3 pt-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-300 w-1/6"
                        >
                          {t('dashboard.spent')}
                        </th>
                        <th
                          scope="col"
                          className="pl-3 pr-4 sm:pr-6 pt-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-300 w-1/4 md:w-1/6"
                        >
                          {t('dashboard.balance')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800">
                      <tr>
                        <td></td>
                        <td
                          className={`whitespace-nowrap px-3 pb-3 text-sm font-semibold text-right ${
                            Number(budgetMonth.allocation) < 0
                              ? 'negative'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {formatMoney(
                            budgetMonth.allocation,
                            budget.currency,
                            {
                              signDisplay: 'auto',
                            }
                          )}
                        </td>
                        <td
                          className={`hidden md:table-cell whitespace-nowrap px-3 pb-3 text-sm font-semibold text-right ${
                            Number(budgetMonth.spent) > 0
                              ? 'positive'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {formatMoney(budgetMonth.spent, budget.currency)}
                        </td>
                        <td
                          className={`whitespace-nowrap pl-3 pr-4 sm:pr-6 pb-3 text-sm font-semibold text-right ${
                            Number(budgetMonth.balance) < 0
                              ? 'negative'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {formatMoney(budgetMonth.balance, budget.currency, {
                            signDisplay: 'auto',
                          })}
                        </td>
                      </tr>
                      {budgetMonth.categories
                        .filter(
                          category =>
                            !category.hidden ||
                            category.envelopes.some(
                              envelope => !envelope.hidden
                            )
                        )
                        .map(category => (
                          <CategoryMonth
                            key={category.id}
                            category={category}
                            budget={budget}
                            editingEnvelope={editingEnvelope}
                            editEnvelope={setEditingEnvelope}
                            reloadBudgetMonth={() => {
                              reloadBudgetMonth()
                            }}
                            setError={setError}
                          />
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
