// @flow

import { type EdgeAccount, type EdgeCurrencyWallet, type EdgeReceiveAddress, type EdgeTransaction } from 'edge-core-js'
import { Alert, Linking } from 'react-native'
import { Actions } from 'react-native-router-flux'

import { SEND_CONFIRMATION } from '../../../../constants/SceneKeys.js'
import s from '../../../../locales/strings.js'
import { type GuiMakeSpendInfo } from '../../../../reducers/scenes/SendConfirmationReducer.js'
import { type GuiPlugin } from '../../../../types/GuiPluginTypes.js'
import { type GuiWallet } from '../../../../types/types.js'

type Wallet = {
  id: string,
  name: string,
  type: string,
  currencyCode: string,
  primaryNativeBalance: string,
  fiatCurrencyCode: string
}
type Wallets = Array<Wallet>
function formatWallet(w: GuiWallet): Wallet {
  return {
    id: w.id,
    name: w.name,
    type: w.type,
    // $FlowFixMe: There is no `currencyInfo`, so what is happening here?
    currencyCode: w.currencyCode ? w.currencyCode : w.currencyInfo.currencyCode,
    primaryNativeBalance: w.primaryNativeBalance,
    fiatCurrencyCode: w.fiatCurrencyCode
  }
}

type Context = {
  plugin: GuiPlugin & { environment: { [key: string]: any } },

  account: EdgeAccount,
  wallet?: GuiWallet,
  wallets: { [id: string]: GuiWallet },
  coreWallets: { [id: string]: EdgeCurrencyWallet },

  back(): void,
  chooseWallet(id: string, currencyCode: string): void,
  toggleWalletList(): void,
  renderTitle(title: string): void
}
type Address = {
  encodeUri: string,
  address: EdgeReceiveAddress
}

// TODO: either get rid of PluginBridge class or refactor out these globals
let navStack: Array<string> = []
// $FlowFixMe
let _context: Context = null

export function pop(): any {
  navStack.pop()
  if (navStack.length === 0) {
    Actions.pop()
  } else {
    if (_context) {
      _context.back()
    }
  }
}

export class PluginBridge {
  context: Context

  constructor(context: Context) {
    _context = this.context = context
    // reset navstack
    navStack = []
  }

  componentDidMount() {
    Actions.refresh({
      leftTitle: 'Back'
    })
  }

  bitidAddress(): Promise<string> {
    // TODO: not supported by core...yet
    return Promise.reject(new Error('not implemented'))
  }

  bitidSignature(): Promise<string> {
    // TODO: not supported by core...yet
    // const {uri, message} = data
    return Promise.reject(new Error('not implemented'))
  }

  chooseWallet(obj: { cbid: string, func: string, id: string, currencyCode: string }): Promise<any> {
    this.context.chooseWallet(obj.id, obj.currencyCode)
    return Promise.resolve(null)
  }

  changeWallet(): Promise<any> {
    this.context.toggleWalletList()
    return Promise.resolve(null)
  }

  selectedWallet(): Promise<Wallet> {
    if (!this.context.wallet) {
      return Promise.reject(new Error('wallet not initialized yet'))
    }
    return Promise.resolve(formatWallet(this.context.wallet))
  }

  wallets(): Promise<Wallets> {
    const wallets = Object.keys(this.context.wallets).map(key => formatWallet(this.context.wallets[key]))
    return Promise.resolve(wallets)
  }

  async getAddress(data: any): Promise<Address> {
    const walletId = data.walletId
    const coreWallet = this.context.coreWallets[walletId]
    const currencyCode = data.currencyCode
    const address = await coreWallet.getReceiveAddress({ currencyCode })
    // $FlowFixMe There are null cases here that might cause issues:
    const encodeUri = await coreWallet.encodeUri(address)
    return { encodeUri, address }
  }

  finalizeReceiveRequest(data: any): Promise<boolean> {
    // const {coreWallet, receiveAddress} = data
    return Promise.reject(new Error('not implemented'))
  }

  _spend(guiMakeSpendInfo: GuiMakeSpendInfo, lockInputs: boolean = true, signOnly: boolean = false): Promise<EdgeTransaction | void> {
    return new Promise((resolve, reject) => {
      if (signOnly) {
        reject(new Error('not implemented'))
      }
      guiMakeSpendInfo.onDone = (error: Error | null, edgeTransaction?: EdgeTransaction) => {
        error ? reject(error) : resolve(edgeTransaction)
      }
      guiMakeSpendInfo.lockInputs = true
      Actions[SEND_CONFIRMATION]({ guiMakeSpendInfo })
    })
  }

  //
  // // Example use of makeSpendRequest
  //
  // const guiMakeSpendInfo: GuiMakeSpendInfo = {
  //   spendTargets: [
  //     {
  //       publicAddress: '1xfoi24t98uaweifuha4t98aweifuy',
  //       nativeAmount: '123456789'
  //     },
  //     {
  //       publicAddress: '3f0923498t7euiyf982398r7fiuyrr',
  //       nativeAmount: '345678912'
  //     }
  //   ],
  //   signOnly: false, // Default is false. True is unimplemented
  //   lockInputs: true
  // }

  // try {
  //   const edgeTransaction = await makeSpendRequest(guiMakeSpendInfo)
  // } catch (e) {
  //   console.log(e)
  // }

  async makeSpendRequest(guiMakeSpendInfo: GuiMakeSpendInfo): Promise<EdgeTransaction | void> {
    const edgeTransaction = await this._spend(guiMakeSpendInfo)
    console.log('Plugin successfully sent transaction')
    console.log(edgeTransaction)
    return edgeTransaction
  }

  // async requestSign (guiMakeSpendInfo: GuiMakeSpendInfo): Promise<EdgeTransaction> {
  //   const guiMakeSpendInfo: GuiMakeSpendInfo = {
  //     spendTargets,
  //     signOnly: true
  //   }
  //   const edgeTransaction = await this._spend(guiMakeSpendInfo)
  //   console.log('Plugin successfully signed transaction')
  //   console.log(edgeTransaction)
  //   return edgeTransaction
  // }

  broadcastTx(data: any): Promise<EdgeTransaction> {
    throw new Error('ErrorUnimplemented')
  }

  saveTx(data: any): Promise<EdgeTransaction> {
    throw new Error('ErrorUnimplemented')
  }

  requestFile(): Promise<string> {
    // TODO
    // const {options} = data
    return Promise.reject(new Error('not implemented'))
  }

  readData = async (data: any): Promise<string> => {
    try {
      const response = await this.context.account.dataStore.getItem(this.context.plugin.storeId, data.key)
      console.log('LOGGING readData response is: ', response)
      return response
    } catch (e) {
      console.log('LOGGING error with readData: ', e)
      throw new Error(e)
    }
  }

  writeData = async (data: any): Promise<boolean> => {
    const { key, value } = data
    try {
      console.log('LOGGING about to write data with key: ', key, ' and value: ', value)
      await this.context.account.dataStore.setItem(this.context.plugin.storeId, key, value)
      console.log('LOGGING successfully written data and returning true')
      return true
    } catch (e) {
      console.log('LOGGING writeData error: ', e)
      return false
    }
  }

  clearData(): Promise<boolean> {
    return this.context.account.dataStore.deleteStore(this.context.plugin.storeId).then(() => {
      return true
    })
  }

  getAffiliateInfo(): Promise<any> {
    return Promise.reject(new Error('not implemented'))
  }

  get(data: any): Promise<string> {
    const { key } = data
    if (this.context.plugin.environment[key]) {
      return Promise.resolve(this.context.plugin.environment[key])
    } else {
      return Promise.reject(new Error(`${key} is not valid for plugin`))
    }
  }

  debugLevel(data: any): Promise<boolean> {
    console.log(`LOGGING ${this.context.plugin.pluginId}  ${data.level}: ${data.text}`)
    return Promise.resolve(true)
  }

  showAlert(data: any): Promise<boolean> {
    Alert.alert(data.title, data.message, [
      {
        onPress() {},
        style: 'default',
        text: s.strings.string_ok
      }
    ])
    return Promise.resolve(true)
  }

  hideAlert(): Promise<boolean> {
    return Promise.reject(new Error('not implemented'))
  }

  title(data: any): Promise<boolean> {
    const { title } = data
    this.context.renderTitle(title)
    return Promise.resolve(true)
  }

  back(): Promise<boolean> {
    pop()
    return Promise.resolve(true)
  }

  exit(): Promise<boolean> {
    Actions.pop()
    return Promise.resolve(true)
  }

  launchExternal(data: any): Promise<any> {
    return Linking.openURL(data.uri)
  }

  navStackClear(): Promise<boolean> {
    navStack = []
    return Promise.resolve(true)
  }

  navStackPush(data: any): Promise<boolean> {
    navStack.push(data.path)
    return Promise.resolve(true)
  }

  navStackPop(): Promise<string> {
    const path = navStack.pop()
    return Promise.resolve(path)
  }
}
