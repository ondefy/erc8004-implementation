// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 15785213231095018201470532468673578096692439198820539377309670265143101797419;
    uint256 constant alphay  = 1296394520949425212813621519384131133783172356467290970792356508608283664819;
    uint256 constant betax1  = 3814042653224743900820667869541332196862447751482683113843883427765300343709;
    uint256 constant betax2  = 4561238309622792242943879436373904699032647197199775922213996338728664774909;
    uint256 constant betay1  = 7825388445701389681218140694618988017295286457447225498936740591445522586615;
    uint256 constant betay2  = 19985269194277380588636698261564085432745158764712992524246161850258562404714;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 10483532871888649837682451857296955747715507029488383100571784904770593817019;
    uint256 constant deltax2 = 9827293185208615314570796443838752014347992277705757119851878779805836735814;
    uint256 constant deltay1 = 6885108643475496357612151796060138258482191104142895582535116678912500409343;
    uint256 constant deltay2 = 3022292348358660086488026687389556718132575902933368363627265157650595995037;

    
    uint256 constant IC0x = 15299098185228034712319974577403714196851403823753077849178796874156959137836;
    uint256 constant IC0y = 13413336013983404921120574981304995856342791393189653601168193893893172842979;
    
    uint256 constant IC1x = 19045295078757195078918389709431408107440166318590408241358090506001319820629;
    uint256 constant IC1y = 1572906027498023054343041139724868794101137920945633995859730215095341432518;
    
    uint256 constant IC2x = 20253328784816608502385815739020487955017812212940439644328500218611748114256;
    uint256 constant IC2y = 20762780283111673167069749510013318978289914710212932999916940511661486279086;
    
    uint256 constant IC3x = 2610399505174981252795902704784555333968753687829300474574652490204356686505;
    uint256 constant IC3y = 9448632756005324311199481926194613713899623470681827560839738299168606748906;
    
    uint256 constant IC4x = 7648471036428359252933529974871543391725898149307206279780480361099516124366;
    uint256 constant IC4y = 3645958767348930238226217377334986714028263463068984051284200818453938994124;
    
    uint256 constant IC5x = 5945029107383616536612280946060949317396288211343450127371261518397351602932;
    uint256 constant IC5y = 11507989679779073389932153272410205530474860603451089792708624698548229816611;
    
    uint256 constant IC6x = 15326855420178717007400984367742163846871225742474913026515695567873463240128;
    uint256 constant IC6y = 15197790610684738579369603231123886074886882338624411755905079225179132052391;
    
    uint256 constant IC7x = 3441915955794312895541358329160263880105825267145238862792923879130625268364;
    uint256 constant IC7y = 7206668009334145250492574747045932065001923831612195816358061195268090678529;
    
    uint256 constant IC8x = 15178163510909100178934739639779465738785437861617662241484918438919329536608;
    uint256 constant IC8y = 9114049326272697121929186013686967304482358639744042063354695840743495741441;
    
    uint256 constant IC9x = 21294143161983265949586945257438218798778386753229645718086320287452377442049;
    uint256 constant IC9y = 9313121159333351141234093202997666431521047346718732938258453337813554517519;
    
    uint256 constant IC10x = 19825967191142686224848826990981184545658740022166014551251372992425460879675;
    uint256 constant IC10y = 1041683451182504390378084412239160399343917497180700800785464640365495688104;
    
    uint256 constant IC11x = 14075484832184137538349450231302138270127830938500267998826955363453190043728;
    uint256 constant IC11y = 5326402393849942595795332895876817050758528463254395471895988347285367546437;
    
    uint256 constant IC12x = 3263263535704836889355220683461105857810489075385309495488710305087155708520;
    uint256 constant IC12y = 3258684039859530849107521075312906493669477198161871182312665694002640642521;
    
    uint256 constant IC13x = 19275109805687421167062862139995567072020053993633117136528728378628352175458;
    uint256 constant IC13y = 5937247935107560998902839192924137306543784889644397758403379882799356009414;
    
    uint256 constant IC14x = 11623986234380152719452452770513617937708523572206040438854886891926491799577;
    uint256 constant IC14y = 19736903052379975993062286379460277474482038925618829402837956374871559698013;
    
    uint256 constant IC15x = 21459629599050590495221227602749970174303015745621138572055393500221426068513;
    uint256 constant IC15y = 5597213587583419297888452374848959149873385417723487345648348634306309099534;
    
    uint256 constant IC16x = 5872146744089707697647426669449061865495384536450680041416451378861328941458;
    uint256 constant IC16y = 799567425797186517574224659267337867210114605373840987203658622201590824302;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
