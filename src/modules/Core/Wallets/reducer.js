// @flow

import { combineReducers } from 'redux'
import { type AbcCurrencyWallet } from 'airbitz-core-types'

import * as ACTION from './action.js'
import * as Constants from '../../../constants/indexConstants'
import type { Action } from '../../ReduxTypes'

type WalletState = { [id: string]: AbcCurrencyWallet } | void

export const initialState = {}

const byId = (state = initialState, action) => {
  switch (action.type) {
    case ACTION.UPDATE_WALLETS: {
      const { currencyWallets } = action.data
      return {
        ...state,
        ...currencyWallets
      }
    }
    default:
      return state
  }
}

export const wallets = (state: WalletState, action: Action) => {
  if (action.type === Constants.LOGOUT || action.type === Constants.DEEP_LINK_RECEIVED) {
    state = undefined
  }

  return combineReducers({ byId })(state, action)
}
