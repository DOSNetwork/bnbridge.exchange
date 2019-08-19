import React, { Component } from "react";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import {
  Grid,
  Typography,
  IconButton,
  SvgIcon
} from '@material-ui/core'
import config from '../../config/config'

import Input from '../common/input';
import Button from '../common/button';
import PageLoader from "../common/pageLoader";
import AssetSelection from "../assetSelection/assetSelection";
import Config from '../../config/config';

import {
  ERROR,
  TOKEN_SWAP_B2E,
  TOKEN_SWAPPED_B2E,

  TOKEN_SWAP_FINALIZE_B2E,
  TOKEN_SWAP_FINALIZED_B2E,

  TOKENS_UPDATED,
  GET_BNB_BALANCES,
  BNB_BALANCES_UPDATED
} from '../../constants/constants'

import Store from "../../stores/store";
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
  memoInstructionBold: {
    color: 'red',
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
  }
});

function CopyIcon(props) {
  return (
    <SvgIcon {...props}>
      <path
        fill={'#6a6a6a'}
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z"
      />
    </SvgIcon>
  );
}


class SwapB2E extends Component {
  state = {
    loading: false,
    page: 0,
    token: '',
    tokenError: false,
    bnbAddress: '',
    bnbAddressError: false,
    bnbReceiveAddress: '',
    ethReceiveAddress: '',
    ethReceiveAddressError: false,
    tokens: [],
    selectedToken: null,
    bnbBalances: null,
  };

  componentWillMount() {
    emitter.on(TOKENS_UPDATED, this.tokensUpdated);

    emitter.on(TOKEN_SWAPPED_B2E, this.tokenSwappedB2E);
    emitter.on(TOKEN_SWAP_FINALIZED_B2E, this.tokenSwapFinalizedB2E);

    // emitter.on(BNB_BALANCES_UPDATED, this.bnbBalancesUpdated);
    emitter.on(ERROR, this.error);
  };

  componentWillUnmount() {
    emitter.removeListener(TOKENS_UPDATED, this.tokensUpdated);

    emitter.removeListener(TOKEN_SWAPPED_B2E, this.tokenSwappedB2E);
    emitter.removeListener(TOKEN_SWAP_FINALIZED_B2E, this.tokenSwapFinalizedB2E);

    // emitter.removeListener(BNB_BALANCES_UPDATED, this.bnbBalancesUpdated);
    emitter.removeListener(ERROR, this.error);
  };

  tokensUpdated = () => {
    const tokens = store.getStore('tokens')

    this.setState({
      tokens: tokens
    })
  };

  // bnbBalancesUpdated = (data) => {
  //   this.setState({ bnbBalances: data, loading: false })
  // };

  error = (err) => {
    this.props.showError(err)
    this.setState({ loading: false })
  };

  tokenSwapB2E = (date) => {
    const {
      ethReceiveAddress,
      bnbAddress,
      selectedToken
    } = this.state

    const content = {
      eth_address: ethReceiveAddress,
      bnb_address: bnbAddress,
      token_uuid: selectedToken.uuid
    }

    dispatcher.dispatch({type: TOKEN_SWAP_B2E, content })
    this.setState({ loading: true })
  };

  tokenSwappedB2E = (data) => {
    this.setState({
      page: 1,
      loading: false,
      bnbReceiveAddress: data.address
   })
   console.log(this.state)
  };

  callFinalizeSwapTokenB2E = () => {
    const {
      ethReceiveAddress,
      bnbAddress,
      selectedToken
    } = this.state

    const content = {
      eth_address: ethReceiveAddress,
      bnb_address: bnbAddress,
      token_uuid: selectedToken.uuid
    }
    dispatcher.dispatch({type: TOKEN_SWAP_FINALIZE_B2E, content})
    this.setState({ loading: true })
  };

  tokenSwapFinalizedB2E = (transactions) => {
    this.setState({
      page: 2,
      loading: false,
      transactions: transactions
    })
  };

  validateSwapTokenB2E = () => {

    this.setState({
      tokenError: false,
      bnbAddressError: false,
      ethReceiveAddressError: false
    })

    const {
      token,
      bnbAddress,
      ethReceiveAddress
    } = this.state

    let error = false

    if(!token || token === '') {
      this.setState({ tokenError: true })
      error = true
    }
    if(!bnbAddress || bnbAddress === '') {
      this.setState({ bnbAddressError: true })
      error = true
    }
    if(!ethReceiveAddress || ethReceiveAddress === '') {
      this.setState({ ethReceiveAddressError: true })
      error = true
    }

    return !error
  };

  onNext = (event) => {
    switch (this.state.page) {
      case 0:
        if(this.validateSwapTokenB2E()) {
          this.tokenSwapB2E()
        }
        break;
      case 1:
        this.callFinalizeSwapTokenB2E()
        break;
      case 2:
        this.resetPage()
        break;
      default:

    }
  };

  resetPage = () => {
    this.setState({
      page: 0,
      token: '',
      tokenError: false,
      bnbAddress: '',
      bnbAddressError: false,
      bnbReceiveAddress: '',
      ethReceiveAddress: '',
      ethReceiveAddressError: false,
      selectedToken: null,
      bnbBalances: null,
    })
  };

  onBack = (event) => {
    this.setState({ page: 0 })
  };

  onHashClick = (hash) => {
    window.open(config.bnbexplorerURL+hash, "_blank")
  };

  onTokenSelected = (value) => {

    const {
      tokens,
      bnbAddress,
    } = this.state

    let theToken = tokens.filter((tok) => {
      return tok.uuid === value
    })

    this.setState({ token: value, selectedToken: theToken[0] /*, amountHelperText: amountHelperText */ })

    if(theToken.length > 0  && bnbAddress && bnbAddress !== "" && bnbAddress.length === Config.bnbAddressLength) {
      const content = {
        bnb_address: bnbAddress,
        token_uuid: theToken[0].uuid
      }
      dispatcher.dispatch({type: GET_BNB_BALANCES, content })
      this.setState({ loading: true, bnbBalances: null })
    }
  };

  onChange = (event) => {
    let val = []
    val[event.target.id] = event.target.value
    this.setState(val)

    // if(event.target.id === 'bnbAddress') {

    //   const {
    //     selectedToken
    //   } = this.state

    //   if(selectedToken  && event.target.value && event.target.value !== "" && event.target.value.length === Config.bnbAddressLength) {
    //     const content = {
    //       bnb_address: event.target.value,
    //       token_uuid: selectedToken.uuid
    //     }
    //     dispatcher.dispatch({type: GET_BNB_BALANCES, content })
    //     this.setState({ loading: true, bnbBalances: null })
    //   }
    // }
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

  onCopyMemo = () => {
    var elm = document.getElementById("memo");
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
      bnbAddress,
      bnbAddressError,
      ethReceiveAddress,
      ethReceiveAddressError,
      loading,
      bnbBalances,
      selectedToken
    } = this.state

    const {
      onIssue
    } = this.props

    return (
      <React.Fragment>
        <AssetSelection onIssue={ onIssue } onTokenSelected={ this.onTokenSelected } disabled={ loading } />
        <Grid item xs={ 12 }>
          <Input
            id='bnbAddress'
            fullWidth={ true }
            label="BNB Address that transfer from"
            placeholder="eg: bnb1mmxvnhkyqrvd2dpskvsgl8lmft4tnrcs97apr3"
            value={ bnbAddress }
            error={ bnbAddressError }
            onChange={ this.onChange }
            disabled={ loading }
          />

          <Input
            id='ethReceiveAddress'
            fullWidth={ true }
            label="Ethereum Address that transfer to"
            placeholder="eg: 0x16121D4a9255601d8C7fb643c1649d0B17732787"
            value={ ethReceiveAddress }
            error={ ethReceiveAddressError }
            onChange={ this.onChange }
            disabled={ loading }
          />

          {/* {
            bnbBalances &&
            <React.Fragment>
              <Typography>
                Current {selectedToken.name} Balance: { bnbBalances.balance } { selectedToken.symbol }
              </Typography>
              <Typography>
                Pending {selectedToken.name} Balance: { bnbBalances.pendingBalance } { selectedToken.symbol }
              </Typography>
            </React.Fragment>
          } */}

        </Grid>
      </React.Fragment>
    )
  };

  renderPage1 = () => {
    const {
      selectedToken,
      bnbAddress,
      bnbReceiveAddress,
      ethReceiveAddress
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
            Transfer your {selectedToken.symbol}-BEP2
          </Typography>
          <Typography className={ classes.instructions }>
            to
          </Typography>

          <Typography className={ classes.instructionBold }>
            <span id='depositAddress'>{bnbReceiveAddress}</span>
            <IconButton
              style={{
                verticalAlign: "top",
                marginRight: "-5px"
              }}
              onClick={this.onCopy}
            >
              <CopyIcon/>
            </IconButton>
          </Typography>

          <Typography className={ classes.instructions }>
            with memo 
          </Typography>

          <Typography className={ classes.memoInstructionBold }>
            <span id='memo'>{ethReceiveAddress}</span>
            <IconButton
              style={{
                verticalAlign: "top",
                marginRight: "-5px"
              }}
              onClick={this.onCopyMemo}
            >
              <CopyIcon/>
            </IconButton>
          </Typography>

          <Typography className={ classes.instructionUnderlined }>
            After you've completed the transfer, click the "NEXT" button so we can verify your transaction.
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
      bnbAddress,
      ethReceiveAddress
    } = this.state

    const {
      classes
    } = this.props

    const reducer = (accumulator, currentValue) => accumulator + parseFloat(currentValue.amount)-5;
    const totalAmount = (transactions.reduce(reducer, 0)).toFixed(2);

    return (
      <React.Fragment>
        <Typography className={ classes.instructions }>
          You will receive another <b>{totalAmount} {selectedToken.symbol}-ERC20</b> in total in your address <b>{ethReceiveAddress}</b>
        </Typography>
      </React.Fragment>
    )
  };

  renderTransactions = () => {
    const {
      transactions,
      bnbAddress,
      selectedToken
    } = this.state

    const {
      classes
    } = this.props

    return transactions.map((transaction) => {
      return (
        <React.Fragment key={transaction.deposit_transaction_hash} >
          <Typography className={ classes.hash } onClick={ (event) => { this.onHashClick(transaction.deposit_transaction_hash); } }>
            <b>{(transaction.amount-5).toFixed(2)} (5 DOS as swap fee) {selectedToken.symbol}-BEP2</b> from <b>{bnbAddress}</b>
          </Typography>
        </React.Fragment>)
    })
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
            label={ page === 2 ? "Done" : "Next" }
            disabled={ loading }
            onClick={ this.onNext }
          />

          <Button
            fullWidth={true}
            label={ "Test"}
            onClick={this.callFinalizeSwapTokenB2E}
          />

        </Grid>
      </Grid>
    )
  };
}

SwapB2E.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(SwapB2E);
