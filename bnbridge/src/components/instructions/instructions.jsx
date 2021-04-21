import React, { Component } from "react";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import {
  Typography,
  Grid
} from '@material-ui/core';
import { colors } from '../../theme'

import {
  FEES_UPDATED
} from '../../constants'

import Store from "../../stores";
const emitter = Store.emitter
const store = Store.store

const styles = theme => ({
  root: {
    width: '400px',
    marginBottom: '24px',
    [theme.breakpoints.down('sm')]: {
      width: '300px'
    }
  },
  header: {
    fontSize: '2.4rem',
    color: colors.grey,
    marginBottom: '24px',
    fontWeight: 400,
    fontFamily: ['Source Sans Pro', 'sans-serif'].join(","),
    [theme.breakpoints.down('md')]: {
      fontSize: '1.4rem'
    }
  },
  action: {
    fontSize: '1rem',
    color: colors.lightBlack,
    display: 'inline-block',
    marginTop: "0.5rem",
    [theme.breakpoints.down('md')]: {
      fontSize: '0.9rem'
    }
  },
  actionRed: {
    fontSize: '1rem',
    color: colors.lightBlack,
    display: 'inline-block',
    marginTop: "0.5rem",
    fontWeight: 'bold'
  },
  price: {
    paddingRight: '60px',
    fontSize: '1rem',
    color: colors.lightBlack,
    display: 'inline-block',
    marginTop: "0.5rem"
  }
});

class Instructions extends Component {
  state = {
    fees: [],
    dos_erc20: "https://etherscan.io/address/0x0A913beaD80F321E7Ac35285Ee10d9d922659cB7",
    dos_bep2: "https://explorer.binance.org/asset/DOS-120",
    dos_bep20: "https://bscscan.com/token/0xdc0f0a5719c39764b011edd02811bd228296887c",
    instruction1: "https://medium.com/dos-network/instructions-on-how-to-swap-erc20-dos-to-bep2-dos-c032bdb7cc7f",
    instruction2: "https://medium.com/spartanprotocol/swap-bep2-token-for-its-bep20-equivalent-a5054eec314d",
    instruction3: "https://community.trustwallet.com/t/how-to-swap-twt-bep2-to-twt-bep20/72718",
  };

  componentWillMount() {
    emitter.on(FEES_UPDATED, this.feesUpdated);
  };

  componentWillUnmount() {
    emitter.removeListener(FEES_UPDATED, this.feesUpdated);
  };

  feesUpdated = () => {
    const fees = store.getStore('fees')

    let feesDisplay = fees.map((fee) => {
      let description = ""

      switch (fee.msg_type) {
        case 'submit_proposal':
          description = 'Submit Listing Proposal'
          break;
        case 'dexList':
          description = 'Listing On DEX'
          break;
        case 'issueMsg':
          description = 'Issue New Token'
          break;
        case 'send':
          description = 'Transfer Tokens'
          break;
        case 'list_proposal_deposit':
          description = 'Listing Proposal Deposit'
          break;
        default:
          break;
      }

      return {
        description: description,
        price: fee.fee/100000000
      }
    })

    this.setState({
      fees,
      feesDisplay: feesDisplay,
    })
  };

  render() {
    const {
      classes
    } = this.props;

    return (
      <Grid
        container
        justify="flex-start"
        alignItems="flex-end">
        <Grid item xs={12} align='left'>
          <div className={ classes.root } >
            <Typography className={ classes.header }>Token Bridge</Typography>
            <li><Typography className={ classes.action }> Swap between <a href={this.state.dos_erc20} target="_blank" rel="noopener noreferrer">ERC20</a> and <a href={this.state.dos_bep2} target="_blank" rel="noopener noreferrer">BEP2</a> DOS token</Typography></li>
            <li><Typography className={ classes.action }> Swap between <a href={this.state.dos_bep2} target="_blank" rel="noopener noreferrer">BEP2</a> and <a href={this.state.dos_bep20} target="_blank" rel="noopener noreferrer">BEP20</a> DOS token</Typography></li>
          </div>
          <div className={ classes.root } >
            <Typography className={ classes.header }>More Info</Typography>
              <Grid item xs={12} align='left'>
                <li><Typography className={ classes.action }>Instruction of ERC20 ↔  BEP2: <a href={this.state.instruction1} target="_blank" rel="noopener noreferrer">Click</a></Typography></li>
                <li><Typography className={ classes.action }>Instruction of BEP2 ↔  BEP20: <a href={this.state.instruction2} target="_blank" rel="noopener noreferrer">Click 1</a>, <a href={this.state.instruction3} target="_blank" rel="noopener noreferrer">Click 2</a></Typography></li>
                <li><Typography className={ classes.action }>Minimum swap amount: 300 DOS</Typography></li>
                <li><Typography className={ classes.action }>Swap fee: 100 DOS</Typography></li>
                {/* { this.renderFees() } */}
            </Grid>
          </div>
        </Grid>
      </Grid>
    )
  };

  renderFees = () => {
    const {
      classes
    } = this.props;

    if(!this.state.feesDisplay) {
      return null
    }

    return this.state.feesDisplay.map((fee) => {
      return (
        <React.Fragment key={fee.description}>
          <Grid item xs={6} align='left' className={ classes.action }>
            {fee.description}
          </Grid>
          <Grid item xs={6} align='right' className={ classes.price }>
            {fee.price} BNB
          </Grid>
        </React.Fragment>
      )
    })
  }
}

Instructions.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Instructions);
