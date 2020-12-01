import React, { Component } from "react";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import {
  Grid,
  Typography,
  IconButton,
  SvgIcon
} from '@material-ui/core'
import config from '../../config'

import Input from '../common/input';
import Button from '../common/button';
import PageLoader from "../common/pageLoader";
import AssetSelection from "../assetSelection";
import Config from '../../config';

import {
  ERROR,
  SWAP_TOKEN,
  TOKEN_SWAPPED,
  FINALIZE_SWAP_TOKEN,
  TOKEN_SWAP_FINALIZED,
  TOKENS_UPDATED,
  GET_BNB_BALANCES,
  BNB_BALANCES_UPDATED,
  GET_ETH_BALANCES,
  ETH_BALANCES_UPDATED,
} from '../../constants'

import Store from "../../stores";
const dispatcher = Store.dispatcher
const emitter = Store.emitter
const store = Store.store

const styles = theme => ({
  root: {
    maxWidth: '400px'
  },
  button: {
    marginTop: '24px',
  },
  frame: {
    border: '1px solid #e1e1e1',
    borderRadius: '3px',
    backgroundColor: '#fafafa',
    padding: '1rem'
  },
  instructions: {
    fontSize: '0.8rem',
    textAlign: 'center',
    marginBottom: '16px'
  },
  instructionUnderlined: {
    fontSize: '0.8rem',
    textDecoration: 'underline',
    textAlign: 'center',
    marginBottom: '16px'
  },
  instructionBold: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '16px'
  },
  hash: {
    fontSize: '0.8rem',
    textAlign: 'center',
    marginBottom: '16px',
    maxWidth: '100%',
    cursor: 'pointer'
  },
  disclaimer: {
    fontSize: '16px',
    marginTop: '24px',
    lineHeight: '42px',
    maxWidth: '250px'
  },
  createAccount: {
    fontSize: '0.8rem',
    textDecoration: 'underline',
    textAlign: 'right',
    marginBottom: '16px',
    cursor: 'pointer'
  },
  icon: {
    display: 'inline-block',
    verticalAlign: 'middle',
    borderRadius: '25px',
    marginRight: '24px',
    height: '30px',
    width: '30px',
    textAlign: 'center',
    marginTop: '16px'
  },
  iconName: {
    marginTop: '16px',
    display: 'inline-block',
    verticalAlign: 'middle'
  },
  swapDirection: {
    marginTop: '20px',
    marginBottom: '16px',
    cursor: 'pointer'
  }
});

function CopyIcon(props) {
  return (
    <SvgIcon {...props}>
      <path
        fill={'#000'}
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z"
      />
    </SvgIcon>
  );
}

function SwapIcon(props) {
  return (
    <SvgIcon {...props}>
      <path
        fill={'#000'}
        d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"
      />
    </SvgIcon>
  );
}

class Swap extends Component {
  state = {
    loading: false,
    page: 0,
    token: '',
    tokenError: false,
    bnbReceiveAddress: '',
    bnbReceiveAddressError: false,
    ethReceiveAddress: '',
    ethReceiveAddressError: false,
    tokens: [],
    selectedToken: null,
    bnbBalances: null,
    ethBalances: null,
    swapDirection: 'E2B'
  };

  componentWillMount() {
    emitter.on(TOKENS_UPDATED, this.tokensUpdated);
    emitter.on(TOKEN_SWAPPED, this.tokenSwapped);
    emitter.on(TOKEN_SWAP_FINALIZED, this.tokenSwapFinalized);
    emitter.on(BNB_BALANCES_UPDATED, this.bnbBalancesUpdated);
    emitter.on(ETH_BALANCES_UPDATED, this.ethBalancesUpdated);
    emitter.on(ERROR, this.error);
  };

  componentWillUnmount() {
    emitter.removeListener(TOKENS_UPDATED, this.tokensUpdated);
    emitter.removeListener(TOKEN_SWAPPED, this.tokenSwapped);
    emitter.removeListener(TOKEN_SWAP_FINALIZED, this.tokenSwapFinalized);
    emitter.removeListener(BNB_BALANCES_UPDATED, this.bnbBalancesUpdated);
    emitter.removeListener(ETH_BALANCES_UPDATED, this.ethBalancesUpdated);
    emitter.removeListener(ERROR, this.error);
  };

  tokensUpdated = () => {
    const tokens = store.getStore('tokens')

    this.setState({
      tokens: tokens
    })
  };

  bnbBalancesUpdated = (data) => {
    this.setState({ bnbBalances: data, loading: false })
  };

  ethBalancesUpdated = (data) => {
    this.setState({ ethBalances: data, loading: false })
  };

  error = (err) => {
    this.props.showError(err)
    this.setState({ loading: false })
  };

  tokenSwapped = (data) => {
    this.setState({
      page: 1,
      clientUuid: data.uuid,
      ethDepositAddress: data.eth_address,
      bnbDepositAddress: data.bnb_address,
      loading: false
   })
  };

  tokenSwapFinalized = (transactions) => {
    this.setState({
      page: 2,
      loading: false,
      transactions: transactions
    })
  };

  callSwapToken = () => {
    const {
      token,
      swapDirection,
      bnbReceiveAddress,
      ethReceiveAddress
    } = this.state

    const content = {
      token_uuid: token,
      direction: swapDirection,
      bnb_address: bnbReceiveAddress,
      eth_address: ethReceiveAddress,
    }
    dispatcher.dispatch({type: SWAP_TOKEN, content })

    this.setState({ loading: true })
  };

  callFinalizeSwapToken = () => {
    const {
      clientUuid,
      selectedToken,
      swapDirection
    } = this.state

    const content = {
      uuid: clientUuid,
      direction: swapDirection,
      token_uuid: selectedToken.uuid
    }
    dispatcher.dispatch({type: FINALIZE_SWAP_TOKEN, content })

    this.setState({ loading: true })
  };

  validateSwapToken = () => {

    this.setState({
      tokenError: false,
      bnbReceiveAddressError: false,
      ethReceiveAddressError: false,
    })

    const {
      token,
      swapDirection,
      bnbReceiveAddress,
      ethReceiveAddress,
    } = this.state

    let error = false

    if(!token || token === '') {
      this.setState({ tokenError: true })
      error = true
    }

    if(swapDirection === 'E2B') {
      if(!bnbReceiveAddress || bnbReceiveAddress === '') {
        this.setState({ bnbReceiveAddressError: true })
        error = true
      }
    } else {
      if(!ethReceiveAddress || ethReceiveAddress === '') {
        this.setState({ ethReceiveAddressError: true })
        error = true
      }
    }

    return !error
  };

  onNext = (event) => {
    switch (this.state.page) {
      case 0:
        if(this.validateSwapToken()) {
          this.callSwapToken()
        }
        break;
      case 1:
        this.callFinalizeSwapToken()
        break;
      case 2:
        this.resetPage()
        break;
      default:

    }
  };

  onSwapDirectionClick = () => {
    const {
      swapDirection
    } = this.state

    this.setState({
      swapDirection: swapDirection === 'E2B' ? 'B2E' : 'E2B',
      ethReceiveAddress: '',
      bnbReceiveAddress: '',
      ethBalances: null,
      bnbBalances: null
    })
  };

  resetPage = () => {
    this.setState({
      page: 0,
      token: '',
      tokenError: false,
      bnbReceiveAddress: '',
      bnbReceiveAddressError: false,
      ethReceiveAddress: '',
      ethReceiveAddressError: false,
      selectedToken: null,
      bnbBalances: null,
      ethBalances: null,
    })
  };

  onBack = (event) => {
    this.setState({ page: 0 })
  };

  onHashClick = (hash) => {
    const {
      swapDirection
    } = this.state

    if(swapDirection === 'E2B') {
      window.open(config.etherscanURL + 'tx/' + hash, "_blank")
    } else {
      window.open(config.explorerURL+ 'tx/' + hash, "_blank")
    }
  };

  onAddressClick = (addr) => {
    const {
      swapDirection
    } = this.state

    if(swapDirection === 'E2B') {
      window.open(config.explorerURL + 'address/' + addr, "_blank")
    } else {
      window.open(config.etherscanURL +  'address/' + addr, "_blank")
    }
  };

  onTokenSelected = (value) => {

    const {
      tokens,
      swapDirection,
      bnbReceiveAddress,
      ethReceiveAddress
    } = this.state

    let theToken = tokens.filter((tok) => {
      return tok.uuid === value
    })

    this.setState({ token: value, selectedToken: theToken[0] /*, amountHelperText: amountHelperText */ })


    if(swapDirection === 'E2B') {
      if(theToken.length > 0 && bnbReceiveAddress && bnbReceiveAddress !== "" && bnbReceiveAddress.length === Config.bnbAddressLength) {
        const content = {
          bnb_address: bnbReceiveAddress,
          token_uuid: theToken[0].uuid
        }
        dispatcher.dispatch({type: GET_BNB_BALANCES, content })
        this.setState({ loading: true })
      }
      this.setState({ bnbBalances: null })
    } else {
      if(theToken.length > 0 && ethReceiveAddress && ethReceiveAddress !== "" && ethReceiveAddress.length === Config.erc20addressLength) {
        const content = {
          eth_address: ethReceiveAddress,
          token_uuid: theToken[0].uuid
        }
        dispatcher.dispatch({type: GET_ETH_BALANCES, content })
        this.setState({ loading: true })
      }
      this.setState({ ethBalances: null })
    }
  };

  onChange = (event) => {
    let val = []
    val[event.target.id] = event.target.value
    this.setState(val)

    if(event.target.id === 'bnbReceiveAddress') {
      const {
        selectedToken
      } = this.state

      if(selectedToken  && event.target.value && event.target.value !== "" && event.target.value.length === Config.bnbAddressLength) {
        const content = {
          bnb_address: event.target.value,
          token_uuid: selectedToken.uuid
        }
        dispatcher.dispatch({type: GET_BNB_BALANCES, content })
        this.setState({ loading: true })
      }
      this.setState({ bnbBalances: null })
    }

    if(event.target.id === 'ethReceiveAddress') {
      const {
        selectedToken,
      } = this.state

      if(selectedToken  && event.target.value && event.target.value !== "" && event.target.value.length === Config.erc20addressLength) {
        const content = {
          eth_address: event.target.value,
          token_uuid: selectedToken.uuid
        }
        dispatcher.dispatch({type: GET_ETH_BALANCES, content })
        this.setState({ loading: true })
      }
      this.setState({ ethBalances: null })
    }
  };

  onCopy = () => {
    var elm = document.getElementById("depositAddress");
    let range;
    // for Internet Explorer

    if (document.body.createTextRange) {
      range = document.body.createTextRange();
      range.moveToElementText(elm);
      range.select();
      document.execCommand("Copy");
    } else if (window.getSelection) {
      // other browsers
      var selection = window.getSelection();
      range = document.createRange();
      range.selectNodeContents(elm);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("Copy");
    }
  };

  renderPage0 = () => {

    const {
      bnbReceiveAddress,
      bnbReceiveAddressError,
      ethReceiveAddress,
      ethReceiveAddressError,
      loading,
      bnbBalances,
      ethBalances,
      selectedToken,
      swapDirection
    } = this.state

    const {
      classes
    } = this.props

    return (
      <React.Fragment>
        { this.renderSwapDirection() }
        <AssetSelection onTokenSelected={ this.onTokenSelected } disabled={ loading } />
        <Grid item xs={ 12 }>
        {
          swapDirection === "E2B" ?
            <React.Fragment>
              <Input
                id='bnbReceiveAddress'
                fullWidth={ true }
                label="BEP2 Receive Address"
                placeholder="eg: bnb13gse9n7mvrjg5w2cymnt4nmxkgj200k9k2l2nh"
                value={ bnbReceiveAddress }
                error={ bnbReceiveAddressError }
                onChange={ this.onChange }
                disabled={ loading }
              />
              {
                bnbBalances &&
                <React.Fragment>
                  <Typography>
                    <strong>Current Balance:</strong> { bnbBalances.balance } {selectedToken.unique_symbol}
                  </Typography>
                </React.Fragment>
              }
              {
                !bnbBalances &&
                <a className={ classes.createAccount } target="_blank" rel="noopener noreferrer" href="https://www.binance.org/en/create">
                  Don't have a Binance Chain account? Create one
                </a>
              }
            </React.Fragment>
            :
            <React.Fragment>
              <Input
                id='ethReceiveAddress'
                fullWidth={ true }
                label="ERC20 Receive Address"
                placeholder="eg: 0xDECAF9CD2367cdbb726E904cD6397eDFcAe6068D"
                value={ ethReceiveAddress }
                error={ ethReceiveAddressError }
                onChange={ this.onChange }
                disabled={ loading }
              />
              {
                ethBalances &&
                <React.Fragment>
                 <Typography>
                   <strong>Current Balance:</strong> { ethBalances.balance } {selectedToken.symbol}
                 </Typography>
                </React.Fragment>
              }
              {
                !ethBalances &&
                <a className={ classes.createAccount } target="_blank" rel="noopener noreferrer" href="https://metamask.io/download.html">
                  Don't have an Ethereum account? Create one
                </a>
              }

             </React.Fragment>
        }
        </Grid>
      </React.Fragment>
    )
  };

  renderPage1 = () => {
    const {
      selectedToken,
      ethDepositAddress,
      bnbDepositAddress,
      swapDirection
    } = this.state

    const {
      classes
    } = this.props

    return (
      <React.Fragment>
        <Grid item xs={ 12 } className={ classes.frame }>
          <Typography className={ classes.instructionUnderlined }>
            Here's what you need to do next:
          </Typography>
          <Typography className={ classes.instructionBold }>
            Transfer your {swapDirection === 'E2B' ? (selectedToken.symbol+'-ERC20') : selectedToken.unique_symbol}
          </Typography>
          <Typography className={ classes.instructions }>
            to
          </Typography>
          <Typography className={ classes.instructionBold }>
            <span id='depositAddress'>{swapDirection === 'E2B' ? ethDepositAddress : bnbDepositAddress}</span>
            <IconButton
              style={{
                marginRight: "-5px"
              }}
              onClick={this.onCopy}
            >
              <CopyIcon/>
            </IconButton>
          </Typography>
          <Typography className={ classes.instructionUnderlined }>
            After you've completed the transfer, click the "SWAP" button so we can verify your transaction.
          </Typography>
        </Grid>
      </React.Fragment>
    )
  };

  renderPage2 = () => {

    const {
      classes
    } = this.props

    return (
      <React.Fragment>
        <Grid item xs={ 12 } className={ classes.frame }>
          <Typography className={ classes.instructionBold }>
            Swap request pending
          </Typography>
          <Typography className={ classes.instructions }>
            We have added the following transaction/s to our log for your address:
          </Typography>
          { this.renderTransactions() }
          { this.renderTotals() }
        </Grid>
      </React.Fragment>
    )
  };

  renderTotals = () => {
    const {
      transactions,
      selectedToken,
      bnbReceiveAddress,
      ethReceiveAddress,
      swapDirection
    } = this.state

    const {
      classes
    } = this.props

    const reducer = (accumulator, currentValue) => accumulator + parseFloat(currentValue.amount)-5;
    const totalAmount = (transactions.reduce(reducer, 0)).toFixed(2);

    return (
      <React.Fragment>
        <Typography className={ classes.hash } onClick={ () => { this.onAddressClick(swapDirection === 'E2B' ? bnbReceiveAddress : ethReceiveAddress)} }>
          You will receive another <b>{totalAmount} { swapDirection === 'E2B' ? selectedToken.unique_symbol : (selectedToken.symbol+'-ERC20') }</b> in your address <b>{ swapDirection === 'E2B' ? bnbReceiveAddress : ethReceiveAddress }</b>
        </Typography>
      </React.Fragment>
    )
  };

  renderTransactions = () => {
    const {
      transactions,
      selectedToken,
      swapDirection
    } = this.state

    const {
      classes
    } = this.props

    return transactions.map((transaction) => {
      return (
        <React.Fragment key={transaction.deposit_transaction_hash} >
          <Typography className={ classes.hash } onClick={ () => { this.onHashClick(transaction.deposit_transaction_hash); } }>
            <b>{(transaction.amount-5).toFixed(2)} (5 DOS as swap fee) { swapDirection === 'E2B' ? (selectedToken.symbol+'-ERC20') : selectedToken.unique_symbol }</b> from <b>{ swapDirection === 'E2B' ? transaction.eth_address : transaction.bnb_address }</b>
          </Typography>
        </React.Fragment>)
    })
  };

  renderSwapDirection = () => {
    const {
      classes
    } = this.props

    const {
      swapDirection
    } = this.state

    let first = 'Binance'
    let second = 'Ethereum'

    if(swapDirection === 'E2B') {
      first = 'Ethereum'
      second = 'Binance'
    }

    return (
      <React.Fragment>
        <Grid item xs={ 5 }>
          <div className={ classes.icon }>
            <img
              alt=""
              src={ require('../../assets/images/'+first+'-logo.png') }
              height="30px"
            />
          </div>
          <div className={ classes.iconName }>
            <Typography  variant='h5'>{ first ==='Binance' ? 'BEP2' : 'ERC20' }</Typography>
          </div>
        </Grid>
        <Grid item xs={ 2 } align='center'>
          <SwapIcon className={ classes.swapDirection } onClick={ this.onSwapDirectionClick } />
        </Grid>
        <Grid item xs={ 5 } align='right'>
          <div className={ classes.icon }>
            <img
              alt=""
              src={ require('../../assets/images/'+second+'-logo.png') }
              height="30px"
            />
          </div>
          <div className={ classes.iconName }>
            <Typography  variant='h5'>{ second ==='Binance' ? 'BEP2' : 'ERC20' }</Typography>
          </div>
        </Grid>
      </React.Fragment>
    )
  };

  render() {
    const {
      classes
    } = this.props

    const {
      page,
      loading,
      // receiveAmount,
      // selectedToken
    } = this.state

    return (
      <Grid container className={ classes.root }>
        { loading && <PageLoader /> }
        { page === 0 && this.renderPage0() }
        { page === 1 && this.renderPage1() }
        { page === 2 && this.renderPage2() }
        <Grid item xs={ 12 } align='right' className={ classes.button }>
          <Button
            fullWidth={true}
            label={ page === 2 ? "Done" : "Swap" }
            disabled={ loading }
            onClick={ this.onNext }
          />
          { page !== 0 &&
            <Button
              fullWidth={true}
              label={ "Back" }
              disabled={ loading }
              onClick={ this.resetPage }
            />
          }

        </Grid>
      </Grid>
    )
  };
}

Swap.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Swap);
